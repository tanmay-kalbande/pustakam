# Pustakam AI (AI Injin) - Platform Specifications & Master Guide

Pustakam AI is a high-performance, multi-model AI book generation engine designed to transform raw ideas into structured, professional, or "street-smart" digital knowledge. It is built as a local-first, privacy-conscious PWA that offers a premium, high-tech experience reminiscent of modern "God-mode" AI tools.

---

## 🎨 Design Philosophy & UX
The platform uses a **Grok-inspired minimal aesthetic** with a focus on immersive, dark environments.

### 1. Immersive Environment (Nebula Background)
- **Physics-Driven Background**: A realistic, real-time "Black Hole" simulation using orbital physics. It features celestial objects (planets, comets, asteroids) that get "spaghettified" as they fall into the singularity.
- **Dynamic Opacity**: Background intensity settles into a subtle ambient glow to maintain readability while keeping the cosmic feel.

### 2. UI Elements
- **Glassmorphism**: Use of `backdrop-blur-2xl` and border-white/10 for a sleek, layered feel.
- **Color System**: Optimized for OLED displays with #000000 blacks, accented by slate-gray borders and cyan/amber highlights.
- **Animations**:
  - **Pixel AI Waves**: Micro-animations that jitter and flow during generation, signifying active AI thought.
  - **Matte Bubbles**: Chat bubbles use a subtle matte finish (#1a1a1b) for readability without glare.
- **Reading Modes**: Three distinct themes for consumption: **Dark**, **Sepia**, and **Light**.
- **Typography**: Premium font pairings including **Outfit** (modern-bold), **Crimson Pro** (classic book style), **Rubik** (brand-aligned UI), and **Nunito** (soft-rounded).

---

## 🚀 The Neural Onboarding (Landing Chat)
Before users create a book, they interact with the **Pustakam Guide**, a minimalist landing-page assistant.

- **Persona**: The Guide is sharp, ultra-concise, and personally engaging. Responses are surgical (under 35 words).
- **Relay Architecture**: To protect system prompts and API keys, the landing chat uses a multi-stage relay:
  - **Browser** → **Vercel Edge (Relay)** → **Render Proxy (Prompt Injection)** → **AI Provider (Cerebras/Groq)**.
- **Context Management**: The chat maintains an 8-message sliding window to ensure efficient token usage while keeping context.

---

## 📖 The Generation Engine
The core of Pustakam is its "Infinite Knowledge Engine," optimized for depth and resilience.

### 1. Intelligent AI Enhancer
The **Enhancer** analyzes vague input (e.g., "coding") and automatically brainstorms learning goals, audience profiles, and complexity levels (Beginner to Advanced).

### 2. Personalities (Generation Modes)
- **Stellar Mode**: The "Professor." Structured, academic, and clear.
- **Blackhole Mode**: The "Hustler." Aggressive "bro-talk" and street-smart slang designed for motivation and "no-bullshit" learning.
- **Desi Mode**: The "Tapori Bhai." Hinglish/Marathi-English humor and roasting to keep learning light yet effective.

### 3. Generation Depth
- **Standard Mode**: Fast, efficient synthesis.
- **Deep Research Mode**: High-depth exploration of the "why" behind concepts.

---

## 🧠 The Study Companion (Learning Lab)
Post-generation, users enter the **Study Workspace**, which transforms static books into interactive mentors.

- **Contextual Doubt Solving**: Highlight any text in a book to ask the AI for clarification. The AI understands exactly what you are highlighting.
- **Intelligent Re-Explanation**: Ask the AI to re-explain a complex section in simplified (EL5), detailed, or "street-smart" mode.
- **Auto-Flashcards**: The engine scans your generated book and builds a deck of interactive flashcards with difficulty tracking and spaced repetition concepts.
- **Cross-Chapter Memory**: The Study Companion remembers the context of previous chapters to maintain continuity in long-form threads.

---

## 🛠 Technical Architecture & Infrastructure
Pustakam is a "Multi-Model Hive" designed to aggregate the world's best intelligence.

### 1. The Multi-Model Hive
- **Providers**: Google (Gemini), Mistral, Groq (Llama/Mixtral), Cerebras (Qwen/Llama), xAI (Grok), and Zhipu (GLM).
- **Orchestration**: The "Headless Engine" handles the logic of which model to use for specific tasks (e.g., GLM for fiction, Gemma for technical logic).

### 2. BYOK (Bring Your Own Key) Sovereignty
Users have total control over their AI costs and privacy.
- **Default State**: Free platform quota (admin-configurable, typically 2 books) via shared platform keys.
- **BYOK State**: Enter your own API key in Settings to unlock unlimited generation.
- **Zero-Middleman Privacy**: User API keys are stored **only** in the browser's local `localStorage` (obfuscated). Keys never touch the Pustakam backend.

### 3. Failover & Resilience
- **Multi-Endpoint Routing**: The Landing Chat automatically fails over from Vercel to Render if latency spikes.
- **Auto-Recovery**: Jittered retries for 429 (Rate Limit) or network errors.
- **Local Persistence**: Paragraph-level checkpointing saves every single word generated to IndexedDB instantly.

---

## ☁️ Persistence & Privacy
- **Hybrid Storage**: 
  - **IndexedDB**: Used for large book data, roadmaps, and content.
  - **LocalStorage**: Used for user preferences, themes, and BYOK keys.
- **Supabase Sync**: Silent background sync for logged-in users to track `books_created` and words generated across devices.
- **Privacy First**: Total "Data Sovereignty"—users can "Purge All System Data" at any time for an instant reset.

---

## 📈 Analytics & Export
- **PDF Engineering**: A custom `pdfmake` engine converts books into high-fidelity PDFs with custom covers, code-block syntax highlighting, and Unicode dash normalization.
- **Time/Word Tracking**: Real-time Words Per Minute (WPM) calculation during generation.
- **Module Completion Radar**: Visual breakdown of learning progress.

---

## 🎭 The Persona Matrix (High-Sovereignty Prompts)
The "soul" of Pustakam AI is its collection of specialized system prompts, designed to extract maximal intelligence and personality from any underlying model.

### 1. The Minimalist Guide (Landing Chat)
- **Objective**: Frictionless onboarding and surgical precision.
- **System Core**: 
  - "Provide elite, high-touch assistance with extreme brevity."
  - "Responses must be surgical: under 35 words."
  - "Focus on book generation, multi-model intelligence, and vibes."

### 2. The Professor (Stellar Mode)
- **Objective**: Comprehensive, structured, and academic knowledge transfer.
- **System Core**:
  - "Generate a comprehensive chapter with ## and ### markdown headers."
  - "Write EXACTLY 2500-4000 words; under 2000 words is a failure."
  - "Include 2-3 practical, real-world examples with code/scenarios."
  - "Do NOT start with 'In this chapter'—dive straight into content."

### 3. The Street Oracle (Blackhole Mode)
- **Objective**: Raw grit, savage motivation, and "Street-Smart" logic.
- **System Core**:
  - "You are the unhinged street oracle—zero filters, all grit."
  - "Roast their excuses like a comedian eviscerating a bad date."
  - "Style Warfare: Punchy titles, short sentences like a bar fight."
  - "Mission: 2500-4500 words. Half-ass it and you are the problem."

### 4. The Tapori Bhai (Desi Mode)
- **Objective**: Hinglish/Marathi-English humor and "Bhai-style" coaching.
- **System Core**:
  - "Primary bhasha: Hinglish or Marthienglish."
  - "Swearing: Natural and limited (10-20% for emphasis). No crude/sexual insults."
  - "Tone: Tough-love from a big brother, uplifting not mean."
  - "Vary roasts for freshness—no repeating the same patterns across chapters."

---

## 🤝 Support & Compliance
- **Direct Access**: Integrated WhatsApp flow and creator email support.
- **Strictly Open-Source**: Adheres to the "AI Agent Rules"—no commercial startup terminology, strictly a research initiative.
- **Legal Infrastructure**: Built-in logic for Terms, Privacy, Compliance, and AI Disclaimers.

---
**Pustakam AI: Built for those who don’t just want to read, but to master.**
