import { DEFAULT_ZHIPU_MODEL, ZHIPU_PROVIDER } from '../constants/ai';
import { APISettings } from '../types';
import { BookModule, BookProject } from '../types/book';
import type { ProviderID, QuotaStatus } from '../types/providers';
import {
  ExplanationMode,
  Flashcard,
  FlashcardDeck,
  FlashcardFeedback,
  StudyAnswer,
  StudyConfidence,
  StudyInteraction,
  StudyQuestion,
  StudyThread,
} from '../types/study';
import { byokStorage } from '../utils/byokStorage';
import { generateId } from '../utils/helpers';
import {
  buildDoubtPrompt,
  buildFlashcardsPrompt,
  buildReExplainPrompt,
  StudyPromptContext,
} from '../utils/studyPrompts';
import { studyStorage } from '../utils/studyStorage';
import { getProviderConfig } from './providerRegistry';
import { generateText } from './providerService';
import { generateViaProxy, TaskType as ProxyTaskType } from './proxyService';

interface StudyRequestBase {
  book: BookProject;
  module: BookModule;
  moduleIndex: number;
  signal?: AbortSignal;
}

interface AskDoubtRequest extends StudyRequestBase {
  question: string;
  selectedText?: string;
}

interface ReExplainRequest extends StudyRequestBase {
  mode: ExplanationMode;
  selectedText?: string;
}

const DEFAULT_SETTINGS: APISettings = {
  selectedProvider: ZHIPU_PROVIDER,
  selectedModel: DEFAULT_ZHIPU_MODEL,
  defaultGenerationMode: 'stellar',
  defaultLanguage: 'en',
};

const cleanText = (value: string, limit: number) => {
  const normalized = value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length <= limit) return normalized;
  return normalized.slice(0, limit).trim();
};

const normalizeConfidence = (value: unknown): StudyConfidence => {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'medium';
};

const ensureStringArray = (value: unknown, count = 2): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, count);
};

const inferFallbackFollowUps = (moduleTitle: string): string[] => [
  `What part of ${moduleTitle} should I review next?`,
  'Can you give me one concrete example to test my understanding?',
];

class LearningService {
  private settings: APISettings = DEFAULT_SETTINGS;
  private quotaMode: QuotaStatus['mode'] = 'proxy';

  updateSettings(settings: APISettings) {
    this.settings = settings;
  }

  setQuotaMode(mode: QuotaStatus['mode']) {
    this.quotaMode = mode;
  }

  async getModuleThread(bookId: string, moduleId: string): Promise<StudyThread | null> {
    return studyStorage.getModuleThread(bookId, moduleId);
  }

  async getFlashcardDeck(bookId: string, moduleId: string): Promise<FlashcardDeck | null> {
    return studyStorage.getFlashcardDeck(bookId, moduleId);
  }

  async deleteStudyState(bookId: string): Promise<void> {
    await studyStorage.deleteStudyState(bookId);
  }

  async recordFlashcardFeedback(
    bookId: string,
    moduleId: string,
    cardId: string,
    feedback: FlashcardFeedback
  ): Promise<FlashcardDeck | null> {
    return studyStorage.recordFlashcardFeedback(bookId, moduleId, cardId, feedback);
  }

  async askModuleDoubt({
    book,
    module,
    moduleIndex,
    question,
    selectedText,
    signal,
  }: AskDoubtRequest): Promise<StudyInteraction> {
    const prompt = buildDoubtPrompt(
      this.buildPromptContext(book, module, moduleIndex),
      question,
      selectedText
    );
    const raw = await this.generateStructuredContent(prompt, 'doubt', signal);
    const parsed = this.parseJsonResponse(raw);

    const questionEntry: StudyQuestion = {
      id: generateId(),
      bookId: book.id,
      moduleId: module.id,
      question: question.trim(),
      selectedText: selectedText?.trim() || undefined,
      createdAt: new Date(),
    };

    const answerEntry: StudyAnswer = {
      id: generateId(),
      questionId: questionEntry.id,
      answer: this.pickRequiredString(parsed.answer, 'Missing answer text from study response.'),
      confidence: normalizeConfidence(parsed.confidence),
      usedContext: this.parseUsedContext(parsed.usedContext),
      followUpSuggestions:
        ensureStringArray(parsed.followUpSuggestions, 2).length > 0
          ? ensureStringArray(parsed.followUpSuggestions, 2)
          : inferFallbackFollowUps(module.title),
      createdAt: new Date(),
    };

    const interaction: StudyInteraction = {
      id: generateId(),
      bookId: book.id,
      moduleId: module.id,
      type: 'doubt',
      title: question.trim(),
      sourceText: selectedText?.trim() || undefined,
      question: questionEntry,
      answer: answerEntry,
      createdAt: new Date(),
    };

    await studyStorage.saveInteraction(book.id, module.id, module.title, interaction);
    return interaction;
  }

  async reExplainModuleSection({
    book,
    module,
    moduleIndex,
    mode,
    selectedText,
    signal,
  }: ReExplainRequest): Promise<StudyInteraction> {
    const sourceText = selectedText?.trim() || this.buildModuleOverviewSnippet(book, module);
    const prompt = buildReExplainPrompt(
      this.buildPromptContext(book, module, moduleIndex),
      mode,
      sourceText
    );
    const raw = await this.generateStructuredContent(prompt, 're_explain', signal);
    const parsed = this.parseJsonResponse(raw);

    const questionEntry: StudyQuestion = {
      id: generateId(),
      bookId: book.id,
      moduleId: module.id,
      question: `Explain ${module.title} in ${mode.replace(/_/g, ' ')} mode`,
      selectedText: sourceText,
      createdAt: new Date(),
    };

    const answerEntry: StudyAnswer = {
      id: generateId(),
      questionId: questionEntry.id,
      answer: this.pickRequiredString(parsed.answer, 'Missing re-explanation text from study response.'),
      confidence: normalizeConfidence(parsed.confidence),
      usedContext: this.parseUsedContext(parsed.usedContext),
      followUpSuggestions:
        ensureStringArray(parsed.followUpSuggestions, 2).length > 0
          ? ensureStringArray(parsed.followUpSuggestions, 2)
          : inferFallbackFollowUps(module.title),
      createdAt: new Date(),
    };

    const interaction: StudyInteraction = {
      id: generateId(),
      bookId: book.id,
      moduleId: module.id,
      type: 're_explain',
      title: `${module.title} · ${mode.replace(/_/g, ' ')}`,
      sourceText,
      mode,
      question: questionEntry,
      answer: answerEntry,
      createdAt: new Date(),
    };

    await studyStorage.saveInteraction(book.id, module.id, module.title, interaction);
    return interaction;
  }

  async generateFlashcards({
    book,
    module,
    moduleIndex,
    signal,
  }: StudyRequestBase): Promise<FlashcardDeck> {
    const prompt = buildFlashcardsPrompt(this.buildPromptContext(book, module, moduleIndex));
    const raw = await this.generateStructuredContent(prompt, 'flashcards', signal);
    const parsed = this.parseJsonResponse(raw);

    const cardsSource = Array.isArray(parsed.cards) ? parsed.cards : [];
    const cards: Flashcard[] = cardsSource
      .map((card, index) => {
        if (!card || typeof card !== 'object') return null;
        const front = this.pickOptionalString((card as Record<string, unknown>).front);
        const back = this.pickOptionalString((card as Record<string, unknown>).back);
        if (!front || !back) return null;

        const difficulty = (card as Record<string, unknown>).difficulty;
        const normalizedDifficulty: FlashcardFeedback =
          difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard'
            ? difficulty
            : 'medium';

        return {
          id: `${module.id}-${index}-${generateId()}`,
          moduleId: module.id,
          front,
          back,
          difficulty: normalizedDifficulty,
          tags: ensureStringArray((card as Record<string, unknown>).tags, 4),
          reviewCount: 0,
          confidenceHistory: [],
        } satisfies Flashcard;
      })
      .filter((card): card is Flashcard => Boolean(card))
      .slice(0, 12);

    if (cards.length === 0) {
      throw new Error('The flashcard generator returned an empty deck. Please retry.');
    }

    const deck: FlashcardDeck = {
      id: `${book.id}:${module.id}:deck`,
      bookId: book.id,
      moduleId: module.id,
      deckTitle:
        this.pickOptionalString(parsed.deckTitle) || `${module.title} Flashcards`,
      cards,
      generatedAt: new Date(),
      sourceSummary: this.buildModuleOverviewSnippet(book, module),
    };

    await studyStorage.saveFlashcardDeck(book.id, deck);
    return deck;
  }

  private buildPromptContext(
    book: BookProject,
    module: BookModule,
    moduleIndex: number
  ): StudyPromptContext {
    const orderedModules = this.getOrderedModules(book);
    const roadmapModule =
      book.roadmap?.modules.find(item => item.id === module.roadmapModuleId) || null;
    const previousModulesSummary = orderedModules
      .slice(0, moduleIndex)
      .slice(-3)
      .map(item => {
        const previousRoadmap =
          book.roadmap?.modules.find(roadmapItem => roadmapItem.id === item.roadmapModuleId) || null;
        return [
          `- ${item.title}`,
          previousRoadmap?.description ? `  Description: ${previousRoadmap.description}` : null,
          `  Key excerpt: ${cleanText(item.content, 320).replace(/\n/g, ' ')}`,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    return {
      bookTitle: book.title,
      learningGoal: book.goal,
      moduleTitle: module.title,
      moduleDescription: roadmapModule?.description,
      moduleObjectives: roadmapModule?.objectives || [],
      moduleContent: module.content,
      previousModulesSummary,
    };
  }

  private getOrderedModules(book: BookProject): BookModule[] {
    if (!book.roadmap?.modules?.length) return [...book.modules];

    const ordered = book.roadmap.modules
      .map(roadmapModule =>
        book.modules.find(module => module.roadmapModuleId === roadmapModule.id)
      )
      .filter((module): module is BookModule => Boolean(module));

    if (ordered.length === 0) return [...book.modules];
    return ordered;
  }

  private buildModuleOverviewSnippet(book: BookProject, module: BookModule): string {
    const roadmapModule =
      book.roadmap?.modules.find(item => item.id === module.roadmapModuleId) || null;
    const parts = [
      roadmapModule?.description || '',
      ...(roadmapModule?.objectives || []).slice(0, 3),
      cleanText(module.content, 420),
    ].filter(Boolean);

    return cleanText(parts.join('\n\n'), 900);
  }

  private async generateStructuredContent(
    prompt: string,
    taskType: ProxyTaskType,
    signal?: AbortSignal
  ): Promise<string> {
    if (!navigator.onLine) {
      throw new Error('No internet connection.');
    }

    const route = this.resolveRoute();

    if (route.mode === 'proxy') {
      try {
        return await generateViaProxy(
          prompt,
          taskType,
          route.model,
          signal,
          undefined,
          undefined,
          route.provider
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const shouldFallbackToModule =
          taskType !== 'module' &&
          (/task/i.test(message) || /400/.test(message) || /proxy/i.test(message));

        if (shouldFallbackToModule) {
          return generateViaProxy(
            prompt,
            'module',
            route.model,
            signal,
            undefined,
            undefined,
            route.provider
          );
        }

        throw error;
      }
    }

    return generateText(route.provider, route.model, route.apiKey, prompt, {
      signal,
      taskType,
      timeoutMs: 150000,
      maxTokens: 4096,
    });
  }

  private resolveRoute():
    | { mode: 'proxy'; provider: ProviderID; model?: string }
    | { mode: 'direct'; provider: ProviderID; model: string; apiKey: string } {
    const selectedProvider = this.settings.selectedProvider;
    const selectedModel = this.settings.selectedModel;
    const hasSelectedKey = byokStorage.hasKey(selectedProvider);
    const configuredProviders = byokStorage.getConfiguredProviders();

    if (hasSelectedKey) {
      return {
        mode: 'direct',
        provider: selectedProvider,
        model: selectedModel,
        apiKey: byokStorage.getKey(selectedProvider)!,
      };
    }

    if (this.quotaMode === 'blocked') {
      if (configuredProviders.length === 0) {
        throw new Error('Your free quota is used up. Add an API key in Settings to use study tools.');
      }

      const fallbackProvider = configuredProviders[0];
      const fallbackConfig = getProviderConfig(fallbackProvider);
      const fallbackKey = byokStorage.getKey(fallbackProvider);
      if (!fallbackKey) {
        throw new Error(`No API key configured for ${fallbackConfig.name}.`);
      }

      return {
        mode: 'direct',
        provider: fallbackProvider,
        model: fallbackConfig.defaultModel,
        apiKey: fallbackKey,
      };
    }

    if (this.quotaMode === 'byok' && configuredProviders.length > 0) {
      const fallbackProvider = configuredProviders.includes(selectedProvider)
        ? selectedProvider
        : configuredProviders[0];
      const fallbackConfig = getProviderConfig(fallbackProvider);
      const fallbackKey = byokStorage.getKey(fallbackProvider);
      if (!fallbackKey) {
        throw new Error(`No API key configured for ${fallbackConfig.name}.`);
      }

      return {
        mode: 'direct',
        provider: fallbackProvider,
        model: fallbackProvider === selectedProvider ? selectedModel : fallbackConfig.defaultModel,
        apiKey: fallbackKey,
      };
    }

    const useProxy = import.meta.env.VITE_USE_PROXY === 'true';
    if (useProxy) {
      const provider = selectedProvider === 'mistral' ? 'mistral' : ZHIPU_PROVIDER;
      return {
        mode: 'proxy',
        provider,
        model: provider === 'mistral' ? selectedModel : undefined,
      };
    }

    const providerConfig = getProviderConfig(selectedProvider);
    if (!providerConfig.supportsBYOK) {
      throw new Error('The selected provider requires the platform proxy, but proxy mode is not enabled.');
    }

    const apiKey = byokStorage.getKey(selectedProvider);
    if (!apiKey) {
      throw new Error(`No API key configured for ${providerConfig.name}.`);
    }

    return {
      mode: 'direct',
      provider: selectedProvider,
      model: selectedModel,
      apiKey,
    };
  }

  private parseJsonResponse(raw: string): Record<string, unknown> {
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '');
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('The study response did not include valid JSON.');
    }

    let jsonString = jsonMatch[0];
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

    try {
      return JSON.parse(jsonString) as Record<string, unknown>;
    } catch {
      jsonString = jsonString.replace(/\n/g, '\\n');
    }

    try {
      return JSON.parse(jsonString) as Record<string, unknown>;
    } catch {
      throw new Error('The study response could not be parsed. Please retry.');
    }
  }

  private pickRequiredString(value: unknown, errorMessage: string): string {
    const next = this.pickOptionalString(value);
    if (!next) throw new Error(errorMessage);
    return next;
  }

  private pickOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  private parseUsedContext(value: unknown): Array<'module' | 'previous_modules' | 'roadmap'> {
    if (!Array.isArray(value)) return ['module'];

    const accepted = value.filter(
      item => item === 'module' || item === 'previous_modules' || item === 'roadmap'
    );

    return accepted.length > 0
      ? (accepted as Array<'module' | 'previous_modules' | 'roadmap'>)
      : ['module'];
  }
}

export const learningService = new LearningService();
