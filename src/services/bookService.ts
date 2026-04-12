// ============================================================================
// FILE: src/services/bookService.ts
// NOTES:
//   1. validateSettings()  -  auto-correct provider; never error-out in proxy mode
//   2. generateWithAI()  -  routes through THREE paths:
//      a) PROXY mode (free tier) → Render proxy with platform API keys
//      b) BYOK mode → direct API call with user's own key via providerService
//      c) BLOCKED → user has no quota and no BYOK key
//   3. getApiKeyForProvider()  -  reads from byokStorage for BYOK mode
//   4. enhanceBookInput()  -  wraps errors so isEnhancing always resets
// ============================================================================

import { BookProject, BookRoadmap, BookModule, RoadmapModule, BookSession } from '../types/book';
import { APISettings, ModelProvider } from '../types';
import type { ProviderID, QuotaStatus } from '../types/providers';
import { generateId } from '../utils/helpers';
import { planService } from './planService';
import { streetPromptService } from './streetPromptService';
import { desiPromptService } from './desiPromptService';
import { AI_SUITE_NAME, DEFAULT_ZHIPU_MODEL, ZHIPU_PROVIDER } from '../constants/ai';
import { generateViaProxy, TaskType as ProxyTaskType } from './proxyService';
import { generateText } from './providerService';
import { byokStorage } from '../utils/byokStorage';
import { getProviderConfig } from './providerRegistry';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Debug helper  -  always logs so DevTools console is never blank ────────────
const dbg = (...args: unknown[]) => console.log('[BookService]', ...args);
const err = (...args: unknown[]) => console.error('[BookService]', ...args);

interface GenerationCheckpoint {
  bookId: string;
  completedModuleIds: string[];
  failedModuleIds: string[];
  moduleRetryCount: Record<string, number>;
  lastSuccessfulIndex: number;
  timestamp: string;
  totalWordsGenerated: number;
}

export interface GenerationStatus {
  currentModule?: {
    id: string;
    title: string;
    attempt: number;
    progress: number;
    generatedText?: string;
  };
  totalProgress: number;
  status: 'idle' | 'generating' | 'completed' | 'error' | 'paused' | 'waiting_retry';
  logMessage?: string;
  totalWordsGenerated?: number;
  aiStage?: 'analyzing' | 'writing' | 'examples' | 'polishing' | 'complete';
  retryInfo?: {
    moduleTitle: string;
    error: string;
    retryCount: number;
    maxRetries: number;
    waitTime?: number;
  };
}

export interface EnhancedBookData {
  goal: string;
  title: string;
  targetAudience: string;
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
  preferences: {
    includeExamples: boolean;
    includePracticalExercises: boolean;
    includeQuizzes: boolean;
  };
  reasoning?: string;
}

class BookGenerationService {
  private settings: APISettings = {
    selectedProvider: ZHIPU_PROVIDER,
    selectedModel: DEFAULT_ZHIPU_MODEL,
    defaultGenerationMode: 'stellar',
    defaultLanguage: 'en',
  };

  // Quota-driven routing mode: 'proxy' (free tier), 'byok' (user key), 'blocked'
  private quotaMode: QuotaStatus['mode'] = 'proxy';

  private onProgressUpdate?: (bookId: string, updates: Partial<BookProject>) => void;
  private onGenerationStatusUpdate?: (bookId: string, status: Partial<GenerationStatus>) => void;
  private requestTimeout = 360000;
  private activeRequests = new Map<string, AbortController>();
  private activeGenerations = new Set<string>();
  private checkpoints = new Map<string, GenerationCheckpoint>();
  private currentGeneratedTexts = new Map<string, string>();
  private userRetryDecisions = new Map<string, 'retry' | 'switch' | 'skip'>();

  private readonly MAX_MODULE_RETRIES = 5;
  private readonly RETRY_DELAY_BASE = 3000;
  private readonly MAX_RETRY_DELAY = 30000;
  private readonly RATE_LIMIT_DELAY = 5000;

  // ============================================================================
  // SETTINGS & CALLBACKS
  // ============================================================================

  updateSettings(settings: APISettings) {
    this.settings = settings;
  }

  /** Set the quota-driven routing mode. Called by App.tsx when quota status changes. */
  setQuotaMode(mode: QuotaStatus['mode']) {
    dbg('setQuotaMode:', mode);
    this.quotaMode = mode;
  }

  getQuotaMode(): QuotaStatus['mode'] {
    return this.quotaMode;
  }

  setProgressCallback(callback: (bookId: string, updates: Partial<BookProject>) => void) {
    this.onProgressUpdate = callback;
  }

  setGenerationStatusCallback(callback: (bookId: string, status: Partial<GenerationStatus>) => void) {
    this.onGenerationStatusUpdate = callback;
  }

  // ============================================================================
  // AI ENHANCER
  // ============================================================================

  public async enhanceBookInput(userInput: string, generationMode?: 'stellar' | 'blackhole'): Promise<EnhancedBookData> {
    dbg('enhanceBookInput called', { userInput: userInput.slice(0, 60), generationMode });

    const isDoge = generationMode === 'blackhole';

    const standardPrompt = `You are an intelligent assistant. Analyze the user's topic and return a JSON object for book creation.

IMPORTANT RULES:
- Respond with ONLY the JSON object below  -  no explanation, no markdown, no code fences.
- Do NOT wrap in \`\`\`json or \`\`\`.
- Start your response with { and end with }.

{"goal": "A clear, specific learning goal (50-150 characters)", "title": "An engaging book title", "targetAudience": "Specific target audience description", "complexityLevel": "beginner | intermediate | advanced", "preferences": {"includeExamples": true, "includePracticalExercises": true, "includeQuizzes": false}, "reasoning": "Brief explanation of your choices"}

User Input: "${userInput}"`;

    const dogePrompt = `You are a savage, street-smart AI assistant for Blackhole Mode. Take the user's idea and return a high-octane JSON response.

IMPORTANT RULES:
- Respond with ONLY the JSON object below  -  no explanation, no markdown, no code fences.
- Start your response with { and end with }.

{"goal": "An aggressive, action-oriented learning goal", "title": "A savage, clickbaity book title", "targetAudience": "Roast the target audience", "complexityLevel": "beginner | intermediate | advanced", "preferences": {"includeExamples": true, "includePracticalExercises": true, "includeQuizzes": false}, "reasoning": "A rough, street-smart reason why they need this"}

User Input: "${userInput}"`;

    const jsonGuardrails = `Additional JSON rules:
- Return valid JSON only.
- All values must be plain JSON strings or booleans.
- Do not use markdown formatting like **bold**, bullets, or backticks inside any value.
- Keep "title" under 80 characters.`;

    const finalPrompt = `${isDoge ? dogePrompt : standardPrompt}\n\n${jsonGuardrails}`;

    try {
      const response = await this.generateWithAI(finalPrompt, undefined, undefined, undefined, 'enhance');
      dbg('enhanceBookInput raw response length:', response.length);
      dbg('enhanceBookInput raw response:', response.slice(0, 500));

      const parsed = this.parseAIJsonResponse(response);
      if (!parsed.goal || !parsed.title) throw new Error('AI response is missing required fields.');
      dbg('enhanceBookInput succeeded:', parsed.title);
      return {
        goal: parsed.goal,
        title: parsed.title,
        targetAudience: parsed.targetAudience,
        complexityLevel: parsed.complexityLevel,
        preferences: parsed.preferences,
        reasoning: parsed.reasoning,
      };
    } catch (e) {
      err('enhanceBookInput FAILED:', e);
      throw e;
    }
  }

  /**
   * Robustly parse a JSON response from any AI model.
   * Handles: markdown fences, trailing commas, smart quotes,
   * unescaped newlines, and partial wrapping text.
   */
  private parseAIJsonResponse(raw: string): Record<string, any> {
    let cleaned = raw.trim();

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');

    // Replace smart quotes with regular quotes
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

    // Try to extract the JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI response does not contain a JSON object.');
    }

    let jsonStr = jsonMatch[0];

    // Fix common "JSON-like" markdown wrappers inside values before parsing.
    jsonStr = jsonStr
      .replace(/:\s*\*\*\s*"([^"]*?)"\s*\*\*/g, ': "$1"')
      .replace(/:\s*\*\s*"([^"]*?)"\s*\*/g, ': "$1"')
      .replace(/:\s*`([^`]*)`/g, ': "$1"');

    // Remove trailing commas before } or ]
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

    // Remove single-line comments (// ...)
    jsonStr = jsonStr.replace(/\/\/[^\n]*/g, '');

    // Attempt standard parse first
    try {
      return JSON.parse(jsonStr);
    } catch {
      dbg('parseAIJsonResponse: standard parse failed, trying cleanup');
    }

    // Escape unescaped newlines inside string values
    jsonStr = jsonStr.replace(/(["'])([^"']*?)\n([^"']*?)\1/g, (_, q, a, b) => `${q}${a}\\n${b}${q}`);

    try {
      return JSON.parse(jsonStr);
    } catch {
      dbg('parseAIJsonResponse: newline-escaped parse also failed, trying field extraction');
    }

    // Last resort: extract fields manually with regex
    const normalizeExtractedValue = (value: string): string => value
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/^\*|\*$/g, '')
      .replace(/^`|`$/g, '')
      .replace(/\\"/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    const extract = (field: string): string => {
      const patterns = [
        new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i'),
        new RegExp(`"${field}"\\s*:\\s*\\*\\*\\s*"([^"]*)"\\s*\\*\\*`, 'i'),
        new RegExp(`"${field}"\\s*:\\s*\\*\\s*"([^"]*)"\\s*\\*`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = raw.match(pattern);
        if (match?.[1]) return normalizeExtractedValue(match[1]);
      }

      return '';
    };

    const goal = extract('goal');
    const title = extract('title');
    if (!goal && !title) {
      throw new Error('Could not parse AI JSON response after multiple attempts.');
    }

    return {
      goal,
      title,
      targetAudience: extract('targetAudience'),
      complexityLevel: extract('complexityLevel') || 'intermediate',
      preferences: { includeExamples: true, includePracticalExercises: true, includeQuizzes: false },
      reasoning: extract('reasoning'),
    };
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  private updateProgress(bookId: string, updates: Partial<BookProject>) {
    if (this.onProgressUpdate) {
      this.onProgressUpdate(bookId, { ...updates, updatedAt: new Date() });
    }
  }

  private updateGenerationStatus(bookId: string, status: Partial<GenerationStatus>) {
    if (this.onGenerationStatusUpdate) {
      this.onGenerationStatusUpdate(bookId, status);
    }
  }

  private clearCurrentGeneratedText(bookId: string): void {
    this.currentGeneratedTexts.delete(bookId);
  }

  private saveCheckpoint(
    bookId: string,
    completedModuleIds: string[],
    failedModuleIds: string[],
    lastIndex: number,
    moduleRetryCount: Record<string, number> = {},
    totalWordsGenerated: number = 0
  ) {
    const checkpoint: GenerationCheckpoint = {
      bookId,
      completedModuleIds,
      failedModuleIds,
      moduleRetryCount,
      lastSuccessfulIndex: lastIndex,
      timestamp: new Date().toISOString(),
      totalWordsGenerated,
    };
    this.checkpoints.set(bookId, checkpoint);
    try {
      localStorage.setItem(`checkpoint_${bookId}`, JSON.stringify(checkpoint));
    } catch (error) {
      err('[CHECKPOINT] Failed to save:', error);
    }
  }

  private loadCheckpoint(bookId: string): GenerationCheckpoint | null {
    if (this.checkpoints.has(bookId)) return this.checkpoints.get(bookId)!;
    try {
      const stored = localStorage.getItem(`checkpoint_${bookId}`);
      if (stored) {
        const checkpoint: GenerationCheckpoint = JSON.parse(stored);
        if (!checkpoint.completedModuleIds || !Array.isArray(checkpoint.completedModuleIds)) return null;
        this.checkpoints.set(bookId, checkpoint);
        return checkpoint;
      }
    } catch (error) {
      err('[CHECKPOINT] Failed to load:', error);
    }
    return null;
  }

  private clearCheckpoint(bookId: string) {
    this.checkpoints.delete(bookId);
    try { localStorage.removeItem(`checkpoint_${bookId}`); } catch {}
  }

  pauseGeneration(bookId: string) {
    try { localStorage.setItem(`pause_flag_${bookId}`, 'true'); } catch {}
    this.activeRequests.get(bookId)?.abort('USER_PAUSE');
    this.updateGenerationStatus(bookId, { status: 'paused', totalProgress: 0, logMessage: 'Generation paused by user' });
  }

  resumeGeneration(bookId: string) {
    try { localStorage.removeItem(`pause_flag_${bookId}`); } catch {}
  }

  isPaused(bookId: string): boolean {
    try { return localStorage.getItem(`pause_flag_${bookId}`) === 'true'; } catch { return false; }
  }

  // ============================================================================
  // SETTINGS VALIDATION
  // - Proxy mode (free tier): zhipu/mistral route through platform proxy
  // - BYOK mode: user's own key, any provider
  // - Blocked: no quota and no key
  // ============================================================================
  validateSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const useProxy = (import.meta as any).env.VITE_USE_PROXY === 'true';

    dbg('validateSettings', {
      quotaMode: this.quotaMode,
      useProxy,
      provider: this.settings.selectedProvider,
      model: this.settings.selectedModel,
    });

    if (!this.settings.selectedProvider) errors.push('No AI provider selected');
    if (!this.settings.selectedModel) errors.push('No model selected');

    if (this.quotaMode === 'blocked') {
      errors.push(
        'Free book quota exhausted. Add your own API key in Settings to continue generating.'
      );
      return { isValid: false, errors };
    }

    if (this.quotaMode === 'proxy') {
      // Proxy mode: zhipu and mistral are supported; others auto-correct
      const proxyProviders: ProviderID[] = ['zhipu', 'mistral'];
      if (!proxyProviders.includes(this.settings.selectedProvider)) {
        dbg('Auto-correcting provider to zhipu for proxy mode');
        this.settings.selectedProvider = ZHIPU_PROVIDER;
        this.settings.selectedModel = DEFAULT_ZHIPU_MODEL;
      }
      // No API key validation needed in proxy mode
    } else if (this.quotaMode === 'byok') {
      // BYOK mode: user must have a key for the selected provider
      const providerConfig = getProviderConfig(this.settings.selectedProvider);
      if (!providerConfig.supportsBYOK) {
        // Selected provider doesn't support BYOK — find one that does
        const configured = byokStorage.getConfiguredProviders();
        if (configured.length > 0) {
          const firstConfigured = configured[0];
          const config = getProviderConfig(firstConfigured);
          dbg(`Auto-switching to BYOK provider: ${firstConfigured}`);
          this.settings.selectedProvider = firstConfigured;
          this.settings.selectedModel = config.defaultModel;
        } else {
          errors.push('No API key configured. Add a key in Settings.');
        }
      } else {
        const apiKey = this.getApiKeyForProvider(this.settings.selectedProvider);
        if (!apiKey) {
          errors.push(`No API key configured for ${providerConfig.name}. Add it in Settings.`);
        }
      }
    }

    if (errors.length > 0) {
      err('validateSettings FAILED:', errors);
    }

    return { isValid: errors.length === 0, errors };
  }

  private getApiKeyForProvider(provider: string): string | null {
    // All BYOK keys are stored in byokStorage now
    return byokStorage.getKey(provider as ProviderID);
  }

  private getApiKey(): string {
    const key = this.getApiKeyForProvider(this.settings.selectedProvider);
    if (!key) throw new Error(`${this.settings.selectedProvider} API key not configured. Add it in Settings.`);
    return key;
  }

  private isRateLimitError(error: any): boolean {
    const msg = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.response?.status;
    return status === 429 || status === 503 || status === 529 ||
      msg.includes('rate limit') || msg.includes('quota') ||
      msg.includes('too many requests') || msg.includes('resource exhausted');
  }

  private isSafetyRefusal(text: string): boolean {
    const refusals = [
      'i cannot fulfill this request', 'i am unable to provide', 'i cannot generate',
      'as an ai language model', 'policy against generating', 'offensive or inappropriate',
      'explicit or harmful', 'cannot comply',
    ];
    return refusals.some(r => text.toLowerCase().includes(r)) && text.length < 300;
  }

  private isNetworkError(error: any): boolean {
    const msg = error?.message?.toLowerCase() || '';
    return msg.includes('network') || msg.includes('fetch') || msg.includes('connection') ||
      msg.includes('enotfound') || msg.includes('econnrefused') || error?.name === 'NetworkError';
  }

  private shouldRetryAutomatically(error: any): boolean {
    return this.isRateLimitError(error) || this.isNetworkError(error);
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.MAX_MODULE_RETRIES) return false;
    if (this.shouldRetryAutomatically(error)) return true;
    const msg = error?.message?.toLowerCase() || '';
    return ['timeout', 'overloaded', 'unavailable', 'internal error', 'bad gateway'].some(e => msg.includes(e));
  }

  private calculateRetryDelay(attempt: number, _isRateLimit: boolean): number {
    const delays = [3000, 8000, 15000, 30000, 60000];
    return delays[Math.min(attempt - 1, delays.length - 1)] + Math.random() * 1000;
  }

  private getProxyTimeoutMs(taskType?: string): number {
    if (taskType === 'enhance' || taskType === 'glossary') {
      return 135_000;
    }
    // Render free tier can cold-start in up to ~50s after 15 min idle.
    // Budget = cold-start (50s) + Zhipu response time. Be generous.
    switch (taskType) {
      case 'enhance':
      case 'glossary':
        return 90_000;   // 90s  -  covers 50s cold-start + ~30s Zhipu
      case 'roadmap':
        return 120_000;  // 2 min
      case 'assemble':
        return 240_000;  // 4 min
      case 'module':
      default:
        return 300_000;  // 5 min
    }
  }

  private getProxyModel(_taskType?: string): import('../types').ModelID | undefined {
    // Server-side orchestration: the API picks the right model tier based on
    // task_type + provider. We intentionally do NOT pass a model hint.
    return undefined;
  }

  /**
   * Timeout for BYOK (user's own API key) requests.
   * No Render cold-start penalty — tighter timeouts than proxy mode.
   */
  private getBYOKTimeoutMs(taskType?: string): number {
    switch (taskType) {
      case 'enhance':
      case 'glossary':
        return 90_000;   // 90s
      case 'roadmap':
        return 120_000;  // 2 min
      case 'assemble':
        return 240_000;  // 4 min
      case 'module':
      default:
        return 300_000;  // 5 min
    }
  }

  setRetryDecision(bookId: string, decision: 'retry' | 'switch' | 'skip') {
    this.userRetryDecisions.set(bookId, decision);
  }

  private async waitForUserRetryDecision(
    bookId: string, moduleTitle: string, errorMsg: string, retryCount: number
  ): Promise<'retry' | 'switch' | 'skip'> {
    this.updateGenerationStatus(bookId, {
      status: 'waiting_retry',
      totalProgress: 0,
      logMessage: `Error generating: ${moduleTitle}`,
      retryInfo: {
        moduleTitle, error: errorMsg, retryCount,
        maxRetries: this.MAX_MODULE_RETRIES,
        waitTime: this.calculateRetryDelay(retryCount, this.isRateLimitError({ message: errorMsg })),
      },
    });

    return new Promise(resolve => {
      const interval = setInterval(() => {
        const decision = this.userRetryDecisions.get(bookId);
        if (decision) {
          this.userRetryDecisions.delete(bookId);
          clearInterval(interval);
          resolve(decision);
        }
      }, 500);
    });
  }

  // ============================================================================
  // generateWithAI  -  proxy timeout + full console logging
  // ============================================================================

  private async generateWithAI(
    prompt: string,
    bookId?: string,
    onChunk?: (chunk: string) => void,
    session?: BookSession,
    taskType?: string
  ): Promise<string> {
    const validation = this.validateSettings();
    if (!validation.isValid) {
      const errorMsg = `Configuration error: ${validation.errors.join(', ')}`;
      err('generateWithAI blocked by validation:', errorMsg);
      throw new Error(errorMsg);
    }

    if (!navigator.onLine) {
      err('generateWithAI: no internet connection');
      throw new Error('No internet connection');
    }

    const useProxy = (import.meta as any).env.VITE_USE_PROXY === 'true';

    dbg('generateWithAI', {
      taskType, useProxy, bookId,
      provider: this.settings.selectedProvider,
      quotaMode: this.quotaMode,
    });

    const requestId = bookId || generateId();
    const abortController = new AbortController();
    this.activeRequests.set(requestId, abortController);

    // ── BYOK path — user's own API key, direct to provider ──────────────
    if (this.quotaMode === 'byok') {
      dbg('→ taking BYOK path:', this.settings.selectedProvider);
      const apiKey = this.getApiKeyForProvider(this.settings.selectedProvider);
      if (!apiKey) {
        throw new Error(`No API key configured for ${this.settings.selectedProvider}. Add it in Settings.`);
      }

      const timeoutMs = this.getBYOKTimeoutMs(taskType);
      const timeoutId = setTimeout(() => {
        abortController.abort();
        err(`BYOK request timed out after ${Math.round(timeoutMs / 1000)}s`);
      }, timeoutMs);

      try {
        const result = await generateText(
          this.settings.selectedProvider,
          this.settings.selectedModel,
          apiKey,
          prompt,
          {
            signal: abortController.signal,
            onChunk,
            taskType,
            timeoutMs,
          }
        );

        dbg('BYOK generateText returned', result.length, 'chars');
        return result;
      } catch (byokError) {
        const msg = byokError instanceof Error ? byokError.message : String(byokError);
        err('BYOK generateText ERROR:', msg);
        throw byokError;
      } finally {
        clearTimeout(timeoutId);
        if (this.activeRequests.get(requestId) === abortController) {
          this.activeRequests.delete(requestId);
        }
      }
    }

    // ── Proxy path — platform API keys (free tier) ──────────────────────
    if (useProxy && this.quotaMode === 'proxy') {
      dbg('→ taking proxy path (free tier)');
      let proxyTimeoutId: ReturnType<typeof setTimeout> | null = null;
      const resolvedTask = (taskType as ProxyTaskType) || 'module';
      const timeoutMs = this.getProxyTimeoutMs(resolvedTask);
      const proxyModel = this.getProxyModel(resolvedTask);

      const timeoutPromise = new Promise<never>((_, reject) => {
        proxyTimeoutId = setTimeout(() => {
          abortController.abort();
          const timeoutSeconds = Math.round(timeoutMs / 1000);
          const msg = `Request timed out after ${timeoutSeconds} seconds. Please try again.`;
          err(`generateWithAI proxy timeout after ${timeoutSeconds}s`);
          reject(new Error(msg));
        }, timeoutMs);
      });

      try {
        // Proxy only supports zhipu and mistral
        const provider = this.settings.selectedProvider;
        dbg('Calling generateViaProxy with task:', resolvedTask, 'model:', proxyModel || '[server default]', 'provider:', provider);

        const result = await Promise.race([
          generateViaProxy(
            prompt,
            resolvedTask,
            proxyModel,
            abortController.signal,
            onChunk,
            bookId,
            provider,
          ),
          timeoutPromise,
        ]);

        dbg('generateViaProxy returned', result.length, 'chars');
        return result;
      } catch (proxyError) {
        const msg = proxyError instanceof Error ? proxyError.message : String(proxyError);
        err('generateViaProxy ERROR:', msg);

        if (msg.startsWith('RATE_LIMIT:') || msg.includes('not authenticated')) {
          throw proxyError;
        }
        throw new Error(`Proxy error: ${msg}`);
      } finally {
        if (proxyTimeoutId !== null) clearTimeout(proxyTimeoutId);
        if (this.activeRequests.get(requestId) === abortController) {
          this.activeRequests.delete(requestId);
        }
      }
    }

    // ── Direct provider path (fallback for non-proxy, non-BYOK setups) ──
    dbg('→ taking direct provider path:', this.settings.selectedProvider);
    const timeoutId = setTimeout(() => {
      abortController.abort();
      this.activeRequests.delete(requestId);
    }, this.requestTimeout);

    try {
      const result = await this.generateWithProvider(prompt, abortController.signal, onChunk);
      return result;
    } finally {
      clearTimeout(timeoutId);
      this.activeRequests.delete(requestId);
    }
  }

  // ============================================================================
  // PROVIDER METHODS
  // ============================================================================

  private async generateWithProvider(
    prompt: string,
    signal?: AbortSignal,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const { url, headers, body } = this.buildProviderRequest(prompt);

    for (let attempt = 0; attempt < this.MAX_MODULE_RETRIES; attempt++) {
      let response: Response;

      try {
        response = await fetch(url, { method: 'POST', headers, body, signal });
      } catch (fetchErr) {
        err('fetch error (attempt', attempt + 1, '):', fetchErr);
        if ((fetchErr as Error).name === 'AbortError') throw fetchErr;
        if (attempt >= this.MAX_MODULE_RETRIES - 1) throw fetchErr;
        await sleep(this.calculateRetryDelay(attempt + 1, false));
        continue;
      }

      if (response.status === 429 || response.status === 503) {
        if (attempt >= this.MAX_MODULE_RETRIES - 1) {
          throw new Error(`Rate limit exceeded after ${this.MAX_MODULE_RETRIES} attempts`);
        }
        const delay = this.calculateRetryDelay(attempt + 1, true);
        console.warn(`[${this.settings.selectedProvider.toUpperCase()}] Rate limit – retrying in ${Math.round(delay / 1000)}s`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as Record<string, any>;
        const msg = errData?.error?.message || errData?.message || `HTTP ${response.status}`;
        err('Provider error:', msg);
        throw new Error(msg);
      }

      if (!response.body) throw new Error('Response body is null');

      return await this.readSSEStream(response.body, onChunk);
    }

    throw new Error(`${this.settings.selectedProvider} API failed after retries`);
  }

  private buildProviderRequest(prompt: string): {
    url: string;
    headers: Record<string, string>;
    body: string;
  } {
    // NOTE: This path is only reached in non-proxy (direct) mode.
    // In production (proxy mode), generateWithAI() never reaches here.
    // Only zhipu and mistral are supported providers.
    const model  = this.settings.selectedModel;
    const apiKey = this.getApiKey();

    const ENDPOINTS: Record<string, string> = {
      zhipu:   'https://api.z.ai/api/paas/v4/chat/completions',
      mistral: 'https://api.mistral.ai/v1/chat/completions',
    };

    const url = ENDPOINTS[this.settings.selectedProvider];
    if (!url) throw new Error(`Unsupported provider: ${this.settings.selectedProvider}`);

    return {
      url,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens:  8192,
        stream:      true,
      }),
    };
  }

  private async readSSEStream(
    body: ReadableStream<Uint8Array>,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const reader  = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer      = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;

        try {
          const data = JSON.parse(trimmed.slice(6));
          const oaiText    = data?.choices?.[0]?.delta?.content || '';
          const googleText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cohereText = data?.type === 'content-delta'
            ? (data?.delta?.message?.content?.text || '')
            : '';
          const text = oaiText || googleText || cohereText;
          if (text) {
            fullContent += text;
            onChunk?.(text);
          }
        } catch {
          // Ignore partial JSON frames
        }
      }
    }

    if (!fullContent) throw new Error('No content generated');
    return fullContent;
  }

  // ============================================================================
  // ROADMAP GENERATION
  // ============================================================================

  async generateRoadmap(session: BookSession, bookId: string): Promise<BookRoadmap> {
    dbg('generateRoadmap start', bookId);
    try {
      localStorage.removeItem(`pause_flag_${bookId}`);
      localStorage.removeItem(`checkpoint_${bookId}`);
    } catch {}

    this.updateProgress(bookId, { status: 'generating_roadmap', progress: 5 });

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const prompt  = this.buildRoadmapPrompt(session);
        const response = await this.generateWithAI(prompt, bookId, undefined, session, 'roadmap');
        const roadmap  = await this.parseRoadmapResponse(response, session);

        planService.incrementBooksCreated().catch(() => {});
        this.updateProgress(bookId, { status: 'roadmap_completed', progress: 10, roadmap });
        dbg('generateRoadmap success', roadmap.totalModules, 'modules');
        return roadmap;
      } catch (e) {
        err('generateRoadmap attempt', attempt + 1, 'failed:', e);
        if (attempt >= 1) {
          this.updateProgress(bookId, { status: 'error', error: 'Roadmap generation failed' });
          throw e;
        }
        await sleep(2000);
      }
    }
    throw new Error('Roadmap generation failed');
  }

  private buildRoadmapPrompt(session: BookSession): string {
    if (session.generationMode === 'blackhole') {
      if (session.language === 'hi' || session.language === 'mr') {
        return desiPromptService.buildRoadmapPrompt(session);
      }
      return streetPromptService.buildRoadmapPrompt(session);
    }

    const reasoningPrompt = session.reasoning ? `\n- Reasoning: ${session.reasoning}` : '';

    return `Create a comprehensive learning roadmap for: "${session.goal}"

Requirements:
- Generate a minimum of 8 modules based on complexity and scope
- Each module should have a clear title and 3-5 specific learning objectives
- Estimate realistic reading/study time for each module
- Target audience: ${session.targetAudience || 'general learners'}
- Complexity: ${session.complexityLevel || 'intermediate'}${reasoningPrompt}

IMPORTANT: Respond with ONLY valid JSON. No markdown, no code fences, no explanation.
Start your response with { and end with }.

{"modules": [{"title": "Module Title", "objectives": ["Objective 1", "Objective 2"], "estimatedTime": "2-3 hours"}], "estimatedReadingTime": "20-25 hours", "difficultyLevel": "intermediate"}`;
  }

  private async parseRoadmapResponse(response: string, session: BookSession): Promise<BookRoadmap> {
    try {
      let cleaned = response.trim()
        .replace(/```json\s*/ig, '')
        .replace(/```\s*/g, '')
        .replace(/[\u201C\u201D]/g, '"')    // smart double quotes
        .replace(/[\u2018\u2019]/g, "'")    // smart single quotes
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '');

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');

      let jsonString = jsonMatch[0];

      // Sanitize common LLM JSON errors
      jsonString = jsonString
        .replace(/,\s*([}\]])/g, '$1')        // remove trailing commas
        .replace(/\/\/[^\n]*/g, '')            // remove single-line comments
        .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F]+/g, ''); // remove invalid control chars

      const roadmap = JSON.parse(jsonString);
      if (!roadmap.modules || !Array.isArray(roadmap.modules)) throw new Error('Invalid roadmap: missing modules array');

      roadmap.modules = roadmap.modules.map((module: any, index: number) => ({
        id: `module_${index + 1}`,
        title: module.title?.trim() || `Module ${index + 1}`,
        objectives: Array.isArray(module.objectives) ? module.objectives : [`Learn ${module.title}`],
        estimatedTime: module.estimatedTime || '1-2 hours',
        order: index + 1,
      }));

      roadmap.totalModules       = roadmap.modules.length;
      roadmap.estimatedReadingTime = roadmap.estimatedReadingTime || `${roadmap.modules.length * 2} hours`;
      roadmap.difficultyLevel    = roadmap.difficultyLevel || session.complexityLevel || 'intermediate';

      return roadmap;
    } catch (error) {
      console.error('[BookService] Failed to parse roadmap response. Raw response:', response);
      throw error;
    }
  }

  // ============================================================================
  // MODULE GENERATION
  // ============================================================================

  async generateModuleContentWithRetry(
    book: BookProject,
    roadmapModule: RoadmapModule,
    session: BookSession,
    attemptNumber: number = 1
  ): Promise<BookModule> {
    if (this.isPaused(book.id)) throw new Error('GENERATION_PAUSED');

    const totalWordsBefore = book.modules.reduce((sum, m) => sum + (m.status === 'completed' ? m.wordCount : 0), 0);
    this.currentGeneratedTexts.set(book.id, '');

    this.updateGenerationStatus(book.id, {
      currentModule: { id: roadmapModule.id, title: roadmapModule.title, attempt: attemptNumber, progress: 0, generatedText: '' },
      totalProgress: 0,
      status: 'generating',
      logMessage: `Starting: ${roadmapModule.title} (via ${this.settings.selectedProvider === 'mistral' ? 'Mistral' : 'Z AI'})`,
      totalWordsGenerated: totalWordsBefore,
      aiStage: 'analyzing',
    });

    try {
      const previousModules = book.modules.filter(m => m.status === 'completed');
      const prompt = this.buildModulePrompt(
        session, roadmapModule, previousModules,
        previousModules.length === 0, roadmapModule.order, book.roadmap?.totalModules || 0
      );

      const moduleContent = await this.generateWithAI(prompt, book.id, (chunk) => {
        if (this.isPaused(book.id)) {
          this.activeRequests.get(book.id)?.abort('USER_PAUSE');
          return;
        }
        const currentText = (this.currentGeneratedTexts.get(book.id) || '') + chunk;
        this.currentGeneratedTexts.set(book.id, currentText);
        const wordCount = currentText.split(/\s+/).filter(w => w.length > 0).length;

        this.updateGenerationStatus(book.id, {
          currentModule: {
            id: roadmapModule.id, title: roadmapModule.title,
            attempt: attemptNumber, progress: Math.min(95, (wordCount / 3000) * 100),
            generatedText: currentText.slice(-800),
          },
          totalProgress: 0,
          status: 'generating',
          totalWordsGenerated: totalWordsBefore + wordCount,
        });
      }, session, 'module');

      const wordCount = moduleContent.split(/\s+/).filter(Boolean).length;

      if (this.isSafetyRefusal(moduleContent)) {
        throw new Error('AI_SAFETY_REFUSAL: The model refused to generate this content.');
      }
      if (wordCount < 150) {
        throw new Error(`Generated content too short (${wordCount} words).`);
      }

      this.currentGeneratedTexts.delete(book.id);
      this.updateGenerationStatus(book.id, { logMessage: `✓ Completed: ${roadmapModule.title}`, aiStage: 'complete' });

      return {
        id: generateId(), roadmapModuleId: roadmapModule.id, title: roadmapModule.title,
        content: moduleContent.trim(), wordCount, status: 'completed', generatedAt: new Date(),
      };

    } catch (error) {
      if (error instanceof Error && error.message === 'GENERATION_PAUSED') throw error;

      // Treat AbortError (cancel/pause) as a pause  -  not a failure
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      const isUserPause = (error instanceof Error && error.message === 'USER_PAUSE') || 
                          (error instanceof Error && error.message.includes('USER_PAUSE'));
      
      if (
        isUserPause ||
        (isAbortError && this.isPaused(book.id)) ||
        this.isPaused(book.id)
      ) {
        throw new Error('GENERATION_PAUSED');
      }

      // If it was just a regular network abort (e.g. NS_BINDING_ABORTED from browser), 
      // treat it as a network error to auto-retry
      if (isAbortError || (error instanceof Error && error.message.toLowerCase().includes('aborted'))) {
        err('Network abort detected. This will be auto-retried.');
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      err('Module generation error:', errorMessage);

      if (attemptNumber < this.MAX_MODULE_RETRIES && this.shouldRetryAutomatically(error)) {
        const delay = this.calculateRetryDelay(attemptNumber, this.isRateLimitError(error));
        this.updateGenerationStatus(book.id, {
          status: 'generating',
          logMessage: `⏳ Auto-retrying in ${Math.round(delay / 1000)}s…`,
        });
        await sleep(delay);
        return this.generateModuleContentWithRetry(book, roadmapModule, session, attemptNumber + 1);
      }

      if (attemptNumber < this.MAX_MODULE_RETRIES && this.shouldRetry(error, attemptNumber)) {
        const decision = await this.waitForUserRetryDecision(book.id, roadmapModule.title, errorMessage, attemptNumber);
        if (decision === 'retry') {
          return this.generateModuleContentWithRetry(book, roadmapModule, session, attemptNumber + 1);
        } else if (decision === 'switch' || errorMessage.includes('AI_SAFETY_REFUSAL')) {
          throw new Error('USER_REQUESTED_MODEL_SWITCH');
        } else {
          return { id: generateId(), roadmapModuleId: roadmapModule.id, title: roadmapModule.title, content: '', wordCount: 0, status: 'error', error: `Skipped: ${errorMessage}`, generatedAt: new Date() };
        }
      }

      this.updateGenerationStatus(book.id, { status: 'error', logMessage: `� -  Failed: ${roadmapModule.title}` });
      return { id: generateId(), roadmapModuleId: roadmapModule.id, title: roadmapModule.title, content: '', wordCount: 0, status: 'error', error: errorMessage, generatedAt: new Date() };
    }
  }

  private buildModulePrompt(
    session: BookSession, roadmapModule: RoadmapModule, previousModules: BookModule[],
    isFirstModule: boolean, moduleIndex: number, totalModules: number
  ): string {
    if (session.generationMode === 'blackhole') {
      if (session.language === 'hi' || session.language === 'mr') {
        return desiPromptService.buildModulePrompt(session, roadmapModule, previousModules, isFirstModule, moduleIndex, totalModules);
      }
      return streetPromptService.buildModulePrompt(session, roadmapModule, previousModules, isFirstModule, moduleIndex, totalModules);
    }

    const contextSummary = !isFirstModule && previousModules.length > 0
      ? `\n\nPREVIOUS MODULES (brief summaries for continuity):\n${previousModules.slice(-3).map(m => {
          const firstParagraph = m.content.split('\n').find(l => l.trim().length > 50)?.trim() || '';
          return `- ${m.title}: ${firstParagraph.substring(0, 150)}…`;
        }).join('\n')}`
      : '';
    const reasoningPrompt = session.reasoning ? `\n- Reasoning: ${session.reasoning}` : '';

    return `Generate a comprehensive chapter for: "${roadmapModule.title}"

CONTEXT:
- Learning Goal: ${session.goal}
- Module ${moduleIndex} of ${totalModules}
- Objectives: ${roadmapModule.objectives.join(', ')}
- Audience: ${session.targetAudience || 'general learners'}
- Complexity: ${session.complexityLevel || 'intermediate'}${reasoningPrompt}${contextSummary}

REQUIREMENTS:
- Write EXACTLY 2500-4000 words (this is critical  -  under 2000 words is a failure)
- ${isFirstModule ? 'Provide a strong introduction to the topic' : 'Build naturally upon previous chapters  -  do NOT repeat their introductions'}
- Use ## and ### markdown headers to structure content
- Include bullet points, numbered lists, and bold key terms
${session.preferences?.includeExamples ? '- Include 2-3 practical, real-world examples with code/scenarios' : ''}
${session.preferences?.includePracticalExercises ? '- Add 3-5 practice exercises at the end' : ''}

DO NOT:
- Start with "In this chapter" or "In this module"  -  dive straight into the content
- Use filler phrases like "In conclusion", "As we have seen", "It is worth noting"
- Repeat information already covered in previous modules
- Generate fewer than 2000 words

STRUCTURE:
## ${roadmapModule.title}
### Introduction
### Core Concepts
### Deep Dive
### Practical Application
${session.preferences?.includePracticalExercises ? '### Practice Exercises' : ''}
### Key Takeaways`;
  }

  // ============================================================================
  // ORCHESTRATION
  // ============================================================================

  async generateAllModulesWithRecovery(book: BookProject, session: BookSession): Promise<void> {
    if (!book.roadmap) throw new Error('No roadmap available');
    if (this.activeGenerations.has(book.id)) {
      console.warn('[BookService] generateAllModulesWithRecovery called while already running for this book. Ignoring double-click.');
      return;
    }

    this.activeGenerations.add(book.id);
    this.resumeGeneration(book.id);

    const checkpoint = this.loadCheckpoint(book.id);
    let completedModules   = [...book.modules.filter(m => m.status === 'completed')];
    const completedIds     = new Set<string>(completedModules.map(m => m.roadmapModuleId).filter(Boolean));
    const failedIds        = new Set<string>();
    const moduleRetryCount: Record<string, number> = {};

    if (checkpoint) {
      checkpoint.completedModuleIds.forEach(id => completedIds.add(id));
      checkpoint.failedModuleIds.forEach(id => failedIds.add(id));
      Object.assign(moduleRetryCount, checkpoint.moduleRetryCount || {});
    }

    const modulesToGenerate = book.roadmap.modules.filter(m => !completedIds.has(m.id));
    if (modulesToGenerate.length === 0) {
      this.updateProgress(book.id, { status: 'roadmap_completed', progress: 90, modules: completedModules });
      return;
    }

    this.updateProgress(book.id, { status: 'generating_content', progress: 15 });

    for (let i = 0; i < modulesToGenerate.length; i++) {
      const roadmapModule = modulesToGenerate[i];

      if (this.isPaused(book.id)) {
        this.saveCheckpoint(book.id, Array.from(completedIds), Array.from(failedIds), i - 1, moduleRetryCount,
          completedModules.reduce((s, m) => s + (m.status === 'completed' ? m.wordCount : 0), 0));
        this.updateProgress(book.id, { status: 'generating_content', modules: [...completedModules], progress: 15 + (completedModules.length / book.roadmap.modules.length) * 70 });
        this.updateGenerationStatus(book.id, { status: 'paused', totalProgress: 0, logMessage: 'Generation paused  -  progress saved' });
        return;
      }

      this.clearCurrentGeneratedText(book.id);

      try {
        const newModule = await this.generateModuleContentWithRetry(
          { ...book, modules: completedModules }, roadmapModule, session,
          (moduleRetryCount[roadmapModule.id] || 0) + 1
        );

        if (this.isPaused(book.id)) {
          if (newModule.status === 'completed') { completedModules.push(newModule); completedIds.add(roadmapModule.id); }
          this.saveCheckpoint(book.id, Array.from(completedIds), Array.from(failedIds), i, moduleRetryCount,
            completedModules.reduce((s, m) => s + (m.status === 'completed' ? m.wordCount : 0), 0));
          this.updateProgress(book.id, { status: 'generating_content', modules: [...completedModules] });
          this.updateGenerationStatus(book.id, { status: 'paused', totalProgress: 0, logMessage: 'Generation paused  -  progress saved' });
          return;
        }

        if (newModule.status === 'completed') {
          completedModules.push(newModule);
          completedIds.add(roadmapModule.id);
          failedIds.delete(roadmapModule.id);
          delete moduleRetryCount[roadmapModule.id];

          const totalWords = completedModules.reduce((s, m) => s + (m.status === 'completed' ? m.wordCount : 0), 0);
          this.saveCheckpoint(book.id, Array.from(completedIds), Array.from(failedIds), i, moduleRetryCount, totalWords);
          this.updateProgress(book.id, { modules: [...completedModules], progress: Math.min(85, 15 + (completedModules.length / book.roadmap.modules.length) * 70) });
        } else {
          failedIds.add(roadmapModule.id);
          completedModules.push(newModule);
          this.saveCheckpoint(book.id, Array.from(completedIds), Array.from(failedIds), i, moduleRetryCount,
            completedModules.reduce((s, m) => s + (m.status === 'completed' ? m.wordCount : 0), 0));
          this.updateProgress(book.id, { modules: [...completedModules], status: 'error', error: `Failed: ${roadmapModule.title}` });
          this.updateGenerationStatus(book.id, { status: 'error', totalProgress: (completedIds.size / book.roadmap.modules.length) * 100, logMessage: `� -  Stopped: ${roadmapModule.title}` });
          return;
        }

        // Mistral has stricter rate limits  -  give it more breathing room
        const cooldown = this.settings.selectedProvider === 'mistral' ? 3000 : 1000;
        if (i < modulesToGenerate.length - 1) await sleep(cooldown);

      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'GENERATION_PAUSED' || error.message === 'USER_REQUESTED_MODEL_SWITCH') {
            this.saveCheckpoint(book.id, Array.from(completedIds), Array.from(failedIds), i, moduleRetryCount,
              completedModules.reduce((s, m) => s + (m.status === 'completed' ? m.wordCount : 0), 0));
            this.updateProgress(book.id, { status: 'generating_content', modules: [...completedModules] });
            this.updateGenerationStatus(book.id, { status: 'paused', totalProgress: 0, logMessage: error.message === 'GENERATION_PAUSED' ? 'Generation paused' : 'Waiting for model switch' });
            return;
          }
        }

        // Catch-all: if we're paused (abort happened outside the module retry), save and exit cleanly
        if (this.isPaused(book.id)) {
          this.saveCheckpoint(book.id, Array.from(completedIds), Array.from(failedIds), i, moduleRetryCount,
            completedModules.reduce((s, m) => s + (m.status === 'completed' ? m.wordCount : 0), 0));
          this.updateProgress(book.id, { status: 'generating_content', modules: [...completedModules] });
          this.updateGenerationStatus(book.id, { status: 'paused', totalProgress: 0, logMessage: 'Generation paused  -  progress saved' });
          return;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        err('generateAllModulesWithRecovery loop error:', errorMessage);
        failedIds.add(roadmapModule.id);
        moduleRetryCount[roadmapModule.id] = (moduleRetryCount[roadmapModule.id] || 0) + 1;
        this.saveCheckpoint(book.id, Array.from(completedIds), Array.from(failedIds), i, moduleRetryCount,
          completedModules.reduce((s, m) => s + (m.status === 'completed' ? m.wordCount : 0), 0));
        completedModules.push({ id: generateId(), roadmapModuleId: roadmapModule.id, title: roadmapModule.title, content: '', wordCount: 0, status: 'error', error: errorMessage, generatedAt: new Date() });
        this.updateProgress(book.id, { modules: [...completedModules], status: 'error', error: `Failed: ${roadmapModule.title}` });
        this.updateGenerationStatus(book.id, { status: 'error', totalProgress: (completedIds.size / book.roadmap.modules.length) * 100, logMessage: `� -  Stopped: ${roadmapModule.title}` });
        return;
      }
    }

    this.clearCheckpoint(book.id);
    try { localStorage.removeItem(`pause_flag_${book.id}`); } catch {}

    this.updateProgress(book.id, { status: 'roadmap_completed', modules: completedModules, progress: 90 });
    this.updateGenerationStatus(book.id, { status: 'completed', totalProgress: 100, logMessage: 'All modules generated successfully' });

    const totalWords = completedModules.reduce((s, m) => s + m.wordCount, 0);
    planService.recordBookCompleted(book.id, book.title || session.goal.slice(0, 50), session.goal, session.generationMode || 'stellar', book.roadmap?.totalModules || completedModules.length, totalWords).catch(() => {});
    this.activeGenerations.delete(book.id);
  }

  async retryFailedModules(book: BookProject, session: BookSession): Promise<void> {
    if (!book.roadmap) throw new Error('No roadmap available');

    const failedModules = book.modules.filter(m => m.status === 'error');
    if (failedModules.length === 0) return;

    this.resumeGeneration(book.id);
    const completedModules = [...book.modules.filter(m => m.status === 'completed')];

    for (const failedModule of failedModules) {
      if (this.isPaused(book.id)) {
        this.updateProgress(book.id, { modules: [...completedModules], status: 'error', error: 'Retry paused' });
        return;
      }

      const roadmapModule = book.roadmap.modules.find(rm => rm.id === failedModule.roadmapModuleId);
      if (!roadmapModule) continue;

      try {
        const newModule = await this.generateModuleContentWithRetry({ ...book, modules: completedModules }, roadmapModule, session);
        if (this.isPaused(book.id)) {
          completedModules.push(newModule);
          this.updateProgress(book.id, { modules: [...completedModules], status: 'error', error: 'Retry paused' });
          return;
        }
        completedModules.push(newModule);
        this.updateProgress(book.id, { modules: [...completedModules] });
        await sleep(1000);
      } catch (error) {
        if (error instanceof Error && error.message === 'GENERATION_PAUSED') {
          this.updateProgress(book.id, { modules: [...completedModules], status: 'error', error: 'Retry paused' });
          return;
        }
      }
    }

    const stillFailed = completedModules.filter(m => m.status === 'error').length;
    if (stillFailed === 0) {
      this.clearCheckpoint(book.id);
      this.updateProgress(book.id, { status: 'roadmap_completed', modules: completedModules, progress: 90 });
    } else {
      this.updateProgress(book.id, { status: 'error', error: `${stillFailed} module(s) still failed`, modules: completedModules });
    }
  }

  // ============================================================================
  // BOOK ASSEMBLY
  // ============================================================================

  async assembleFinalBook(book: BookProject, session: BookSession): Promise<void> {
    this.updateProgress(book.id, { status: 'assembling', progress: 90 });

    try {
      const introduction = await this.generateBookIntroduction(session, book.roadmap!);
      const summary = await this.generateBookSummary(session, book.modules);
      let glossary = '';

      try {
        glossary = await this.generateGlossary(book.modules);
      } catch (glossaryError) {
        err('generateGlossary failed, using local fallback glossary:', glossaryError);
        glossary = this.buildFallbackGlossary(book.modules);
      }

      const totalWords   = book.modules.reduce((s, m) => s + m.wordCount, 0);
      const providerName = this.getProviderDisplayName();

      const finalBook = [
        `# ${book.title}\n`,
        `**Generated:** ${new Date().toLocaleDateString()}\n`,
        `**Words:** ${totalWords.toLocaleString()}\n`,
        `**Provider:** ${providerName} (Smart Orchestration)\n\n`,
        `---\n\n## Table of Contents\n`,
        this.generateTableOfContents(book.modules),
        `\n\n---\n\n## Introduction\n\n${introduction}\n\n---\n\n`,
        ...book.modules.map((m, i) => `${m.content}\n\n${i < book.modules.length - 1 ? '---\n\n' : ''}`),
        `\n---\n\n## Summary\n\n${summary}\n\n---\n\n`,
        `## Glossary\n\n${glossary}`,
      ].join('');

      this.clearCheckpoint(book.id);
      try { localStorage.removeItem(`pause_flag_${book.id}`); } catch {}

      this.updateProgress(book.id, { status: 'completed', progress: 100, finalBook, totalWords });
    } catch (error) {
      err('assembleFinalBook failed:', error);
      this.updateProgress(book.id, { status: 'error', error: 'Book assembly failed' });
      throw error;
    }
  }

  private getProviderDisplayName(): string {
    const names: Record<string, string> = {
      zhipu: AI_SUITE_NAME, google: 'Google Gemini', mistral: 'Mistral AI',
      xai: 'xAI', groq: 'Groq', openrouter: 'OpenRouter', cohere: 'Cohere',
    };
    return names[this.settings.selectedProvider] || 'AI';
  }

  private generateTableOfContents(modules: BookModule[]): string {
    return modules.map((m, i) => `${i + 1}. [${m.title}](#${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`).join('\n');
  }

  private async generateBookIntroduction(session: BookSession, roadmap: BookRoadmap): Promise<string> {
    const prompt = `Generate a compelling introduction for: "${session.goal}"

ROADMAP:
${roadmap.modules.map(m => `- ${m.title}`).join('\n')}

TARGET: ${session.targetAudience || 'general learners'}
LEVEL: ${roadmap.difficultyLevel}

Write 800-1200 words covering: welcome and purpose, what readers will learn, book structure, motivation. Use ## markdown headers.`;
    return await this.generateWithAI(prompt, undefined, undefined, session, 'assemble');
  }

  private async generateBookSummary(session: BookSession, modules: BookModule[]): Promise<string> {
    const prompt = `Generate a summary for: "${session.goal}"

MODULES:
${modules.map(m => `- ${m.title}`).join('\n')}

Write 600-900 words covering: key learning outcomes, important concepts recap, next steps, congratulations.`;
    return await this.generateWithAI(prompt, undefined, undefined, session, 'assemble');
  }

  private async generateGlossary(modules: BookModule[]): Promise<string> {
    // Keep the glossary prompt small and high-signal so the final pass stays reliable.
    const uniqueSignals = Array.from(new Set(
      modules.flatMap(module =>
        module.content
          .split('\n')
          .map(line => line.trim())
          .filter(line =>
            line.length > 0 &&
            line.length <= 120 &&
            (line.startsWith('#') || line.startsWith('**') || line.startsWith('- **'))
          )
      )
    ));

    const glossaryTerms = this.extractGlossaryTerms(modules, uniqueSignals);
    const compactSignals = uniqueSignals.slice(0, 90).join('\n').substring(0, 6000);

    const primaryPrompt  = `Create a concise glossary from these extracted headings and highlighted terms:
${compactSignals}

Rules:
- Include 10-14 important terms only
- Skip duplicates and generic filler terms
- Keep definitions to one crisp sentence
- Sort alphabetically

Format:
**Term**: Definition.`;

    try {
      return await this.generateWithAI(primaryPrompt, undefined, undefined, undefined, 'glossary');
    } catch (primaryError) {
      err('Primary glossary prompt failed, retrying with a smaller seed set:', primaryError);
    }

    const fallbackPrompt = `Create a concise glossary for this book using only the strongest topic signals.

MODULE TITLES:
${modules.map(module => `- ${module.title}`).join('\n')}

KEY TERMS:
${glossaryTerms.slice(0, 30).map(term => `- ${term}`).join('\n')}

Rules:
- Include 8-12 important terms only
- Skip duplicates and generic filler terms
- Keep each definition to one crisp sentence
- Sort alphabetically

Format:
**Term**: Definition.`;

    try {
      return await this.generateWithAI(fallbackPrompt, undefined, undefined, undefined, 'glossary');
    } catch (fallbackError) {
      err('Fallback glossary prompt failed, returning local glossary:', fallbackError);
      return this.buildFallbackGlossary(modules, glossaryTerms);
    }
  }

  private extractGlossaryTerms(modules: BookModule[], signalLines: string[] = []): string[] {
    const stopTerms = new Set([
      'introduction', 'summary', 'conclusion', 'key takeaways', 'next steps',
      'overview', 'example', 'examples', 'exercise', 'exercises', 'quiz',
      'table of contents', 'chapter summary', 'final thoughts',
    ]);

    const candidates = [
      ...modules.map(module => module.title),
      ...signalLines,
      ...modules.flatMap(module =>
        Array.from(module.content.matchAll(/\*\*([^*\n]{2,80})\*\*/g)).map(match => match[1])
      ),
    ];

    return Array.from(new Set(
      candidates
        .map(candidate => candidate
          .replace(/^[-#*\s:]+/, '')
          .replace(/\*\*/g, '')
          .replace(/`/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        )
        .filter(candidate =>
          candidate.length >= 3 &&
          candidate.length <= 60 &&
          candidate.split(' ').length <= 6 &&
          !/^\d+$/.test(candidate) &&
          !stopTerms.has(candidate.toLowerCase())
        )
    ));
  }

  private buildFallbackGlossary(modules: BookModule[], preferredTerms: string[] = []): string {
    const terms = (preferredTerms.length > 0 ? preferredTerms : this.extractGlossaryTerms(modules))
      .slice(0, 12)
      .sort((a, b) => a.localeCompare(b));

    if (terms.length === 0) {
      return '**Core Concepts**: Review the chapter headings and highlighted callouts above for the main vocabulary introduced in this book.';
    }

    return terms
      .map(term => `**${term}**: A key concept introduced in this book; refer to the related chapter for the full explanation and examples.`)
      .join('\n\n');
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  downloadAsMarkdown(project: BookProject): void {
    if (!project.finalBook) throw new Error('No book content available');
    const blob     = new Blob([project.finalBook], { type: 'text/markdown;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const safeTitle = project.title.replace(/[^a-z0-9\s-]/gi, '').replace(/\s+/g, '_').toLowerCase().substring(0, 50);
    a.href         = url;
    a.download     = `${safeTitle}_${new Date().toISOString().slice(0, 10)}_book.md`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  cancelActiveRequests(bookId?: string): void {
    if (bookId) {
      this.activeRequests.get(bookId)?.abort('USER_PAUSE');
      this.activeRequests.delete(bookId);
      this.pauseGeneration(bookId);
      this.activeGenerations.delete(bookId);
    } else {
      this.activeRequests.forEach(c => c.abort('USER_PAUSE'));
      this.activeRequests.clear();
      this.activeGenerations.clear();
    }
  }

  hasCheckpoint(bookId: string): boolean {
    return this.checkpoints.has(bookId) || localStorage.getItem(`checkpoint_${bookId}`) !== null;
  }

  getCheckpointInfo(bookId: string): { completed: number; failed: number; total: number; lastSaved: string } | null {
    const cp = this.loadCheckpoint(bookId);
    if (!cp) return null;
    const completed = Array.isArray(cp.completedModuleIds) ? cp.completedModuleIds.length : 0;
    const failed    = Array.isArray(cp.failedModuleIds) ? cp.failedModuleIds.length : 0;
    return { completed, failed, total: completed + failed, lastSaved: new Date(cp.timestamp).toLocaleString() };
  }
}

export const bookService = new BookGenerationService();
