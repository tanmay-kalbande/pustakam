# Study Companion Roadmap

This document is an execution-ready plan for evolving Pustakam from an AI book generator into a high-retention study product.

The goal is not to bolt on random features. The goal is to turn each generated module into:

1. A readable lesson
2. An interactive tutor
3. A recall system
4. A progress-aware study workflow

## Product Direction

Current product:
- User gives a topic
- App generates a roadmap
- App generates modules
- App assembles a final book

Target product:
- User gets a structured book
- User can ask doubts inside any chapter
- User can re-explain difficult parts in multiple styles
- User can turn chapters into flashcards and quizzes
- App remembers weak areas and helps revision

North-star shift:
- From "AI writes a book"
- To "AI helps you learn and retain"

## Why These Features Fit Naturally

These features are a direct extension of the current architecture:

- The app already has module content in `BookProject.modules`
- The reader already stores reading progress
- The app already has proxy/direct AI request paths
- The app already has a book detail screen that can host post-generation learning tools

This means the next layer should sit on top of the module content, not create a brand-new product surface.

## Important Current Constraint

Before implementing the study layer, note one architectural issue in the current UI:

- `src/components/BookView.tsx` renders `ReadingMode` using `currentBook.finalBook`
- `ReadingMode` receives `currentModuleIndex={0}`
- This means the current reading experience is book-level, not module-aware

This is the first thing to improve.

Why it matters:
- Doubt resolver should know which module the learner is reading
- Explain differently should target a specific concept or section
- Flashcards should be generated from the active module, not the entire final book by default
- Future quizzes and weak-area tracking should attach to modules

## Build Order

### Tier 1

Build these first:

1. Reader refactor to module-aware study surface
2. Doubt resolver
3. Explain differently
4. Chapter-to-flashcards

### Tier 2

Build after Tier 1:

1. Chapter-to-quizzes
2. Adaptive study mode
3. Weakness-aware revision
4. Progress-linked reading

## Architecture Plan

## Phase 0: Foundation Refactor

Goal:
- Make the completed book experience module-aware and study-ready

### What to change

#### 1. Add a study-focused view model

Files:
- `src/types/book.ts`
- `src/components/BookView.tsx`

Add types for:
- `StudyQuestion`
- `StudyAnswer`
- `ExplanationMode`
- `Flashcard`
- `FlashcardDeck`
- `QuizQuestion`
- `QuizAttempt`
- `WeakArea`

Suggested type additions:

```ts
export type ExplanationMode =
  | 'simpler'
  | 'deeper'
  | 'step_by_step'
  | 'analogy'
  | 'exam_focused'
  | 'practical';

export interface StudyQuestion {
  id: string;
  bookId: string;
  moduleId: string;
  question: string;
  selectedText?: string;
  createdAt: Date;
}

export interface StudyAnswer {
  id: string;
  questionId: string;
  answer: string;
  confidence?: 'high' | 'medium' | 'low';
  followUpSuggestions?: string[];
  createdAt: Date;
}

export interface Flashcard {
  id: string;
  moduleId: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
}
```

#### 2. Split reading into active module state

Files:
- `src/components/BookView.tsx`
- `src/utils/readingProgress.ts`

Changes:
- Add `selectedModuleIndex` state in `BookView`
- Read the active module from `currentBook.modules[selectedModuleIndex]`
- Keep `Read Book` tab, but let users switch between module reading and full-book reading
- Save reading progress per module, not just per book

Minimum UX change:
- Left rail: module list
- Main panel: active module content
- Right rail or bottom drawer: study tools

#### 3. Add a dedicated learning service

New file:
- `src/services/learningService.ts`

Reason:
- `bookService.ts` is already responsible for roadmap generation, content generation, checkpoints, retry, and assembly
- Study features should not inflate `bookService.ts`

`learningService.ts` should own:
- doubt answering
- re-explanation
- flashcard generation
- quiz generation later

### Acceptance criteria

- User can open a completed book
- User can switch between modules while reading
- Reader knows active `bookId` and `moduleId`
- Reader can support feature drawers/panels without major layout breakage

## Phase 1: Doubt Resolver

Priority:
- Highest

Reason:
- This turns the book from static content into an interactive tutor
- It creates the user behavior pattern that later powers re-explaining, quizzes, and revision

### UX

Add to `Read Book`:
- A floating "Ask this chapter" button
- A side panel or bottom sheet on mobile
- Text input for user question
- Optional "Ask about selected text" action

Ideal interaction:
- User highlights a paragraph or uses current module context
- User asks: "Why is this important?" or "Can you explain this formula?"
- App answers only using module context plus limited broader book context

### Architecture

Files:
- `src/components/BookView.tsx`
- `src/services/learningService.ts`
- `src/services/proxyService.ts`
- `src/services/providerService.ts`

Add a new task type to proxy flow:

```ts
type TaskType =
  | 'roadmap'
  | 'module'
  | 'enhance'
  | 'assemble'
  | 'glossary'
  | 'doubt'
  | 're_explain'
  | 'flashcards'
  | 'quiz';
```

### Prompt contract

The doubt resolver must not answer like a generic chatbot.

Rules:
- Use the active module as primary context
- Use previous completed modules as secondary context only if needed
- If context is insufficient, say so clearly
- Do not invent facts that are not supported by the provided content
- Prefer teaching over summarizing
- End with 2 suggested follow-up questions

Suggested response shape:

```json
{
  "answer": "Clear explanation here",
  "confidence": "high",
  "usedContext": ["module", "previous_modules"],
  "followUpSuggestions": [
    "How does this connect to the previous idea?",
    "Can I see a practical example?"
  ]
}
```

### Storage

Persist per-module Q&A history in IndexedDB-backed local storage.

New persistence bucket ideas:
- `studyThreads`
- `flashcardDecks`
- `quizAttempts`

### Analytics to track

- questions asked per session
- avg response rating
- follow-up question rate
- percentage of readers who use Q&A at least once

### Acceptance criteria

- User can ask a question inside a module
- User gets answer with visible loading/error state
- User can see prior questions for that module
- User can retry on failure
- Mobile layout is usable

## Phase 2: Explain Differently

Priority:
- Very high

Reason:
- Fast to ship
- High perceived intelligence
- Excellent learning value

### UX

Show 6 buttons in the study panel:
- Simpler
- Deeper
- Step by step
- Analogy
- Exam-focused
- Practical

This should work on:
- selected text
- current paragraph
- current module summary block

### Architecture

Reuse:
- same `learningService.ts`
- same study panel shell from doubt resolver
- same response history UI pattern

Do not create six separate systems.

Create one API:

```ts
reExplainModuleSection({
  book,
  module,
  selectedText,
  mode,
})
```

### Prompt contract

Each mode should apply a teaching transform:

- `simpler`: reduce jargon, explain like a beginner
- `deeper`: add conceptual depth and nuance
- `step_by_step`: break down sequence and dependencies
- `analogy`: explain using relatable analogy
- `exam_focused`: key points, memory anchors, likely questions
- `practical`: real use cases, implementation, examples

Guardrails:
- Preserve correctness
- Do not drift beyond module topic
- If selected text is too short, expand using surrounding section context

### Acceptance criteria

- User can click any explanation mode and get result in the same panel
- Result is clearly labeled by mode
- User can compare original text vs transformed explanation
- Re-requests are deduped and show loading state properly

## Phase 3: Chapter-to-Flashcards

Priority:
- High

Reason:
- Creates daily return habit
- Strong study utility
- Sets up quiz and spaced repetition later

### UX

From each completed module:
- "Generate flashcards" button
- Deck view with card count, tags, difficulty
- Study mode: reveal answer, mark easy/medium/hard

Keep initial version simple:
- per-module deck
- no full spaced repetition engine in v1

### Architecture

Files:
- `src/services/learningService.ts`
- `src/components/BookView.tsx`
- optional new components:
  - `src/components/study/FlashcardPanel.tsx`
  - `src/components/study/FlashcardDeckView.tsx`

Generate cards using:
- module content
- roadmap objectives
- module title

### Prompt contract

Cards must be:
- active recall, not trivia
- concise
- non-duplicative
- mixed difficulty
- concept-first, not wording-first

Suggested output:

```json
{
  "deckTitle": "Module 3 Flashcards",
  "cards": [
    {
      "front": "What is the difference between X and Y?",
      "back": "X is ... while Y is ...",
      "difficulty": "medium",
      "tags": ["fundamentals", "comparison"]
    }
  ]
}
```

### Data model

Attach decks per module:
- `bookId`
- `moduleId`
- `generatedAt`
- `cards`

Track study interactions later:
- `lastReviewedAt`
- `confidenceHistory`
- `reviewCount`

### Acceptance criteria

- User can generate flashcards from a module
- Deck persists locally
- User can study the deck without regenerating
- Deck generation handles loading, empty result, and retry states

## Tier 2 Plan

## Phase 4: Chapter-to-Quizzes

Dependency:
- Flashcard and module study flow exists

### Goal

Turn passive reading into active retrieval.

### First version

Support:
- multiple-choice
- short-answer
- "explain in your own words"

Score dimensions:
- correctness
- confidence
- topic-level weakness

### Key implementation note

Do not ship quiz generation before:
- module-aware reader exists
- answer storage exists
- flashcard generation pattern exists

## Phase 5: Adaptive Study Mode

Dependency:
- quizzes
- progress history

### Goal

Convert the book into a study plan:
- module order
- daily goals
- review queue
- difficulty pacing

### First version

Build a lightweight study scheduler:
- choose study intensity
- choose target exam date or completion target
- generate daily module + flashcard + quiz plan

Keep it local-first.

## Phase 6: Weakness-Aware Revision

Dependency:
- quiz attempts
- explanation usage
- flashcard difficulty feedback

### Goal

Detect weak topics and regenerate support content only where needed.

Signals for weakness:
- repeated wrong quiz answers
- repeated "explain differently" requests on same concept
- repeated doubt questions in same module
- flashcards marked hard repeatedly

Outputs:
- simplified explanation pack
- targeted revision notes
- micro-quiz on weak concepts

## Phase 7: Progress-Linked Reading

Dependency:
- study mode

### Goal

Merge reading behavior and study behavior:
- resume where user stopped
- show next recommended action
- show whether to read, revise, or quiz

Example:
- "Continue Module 4"
- "Review 6 difficult flashcards from Module 2"
- "Take a 5-question quiz before moving on"

## Recommended File Structure

Use a small study domain instead of stuffing everything into `BookView.tsx`.

Suggested additions:

```text
src/components/study/
  StudyPanel.tsx
  DoubtResolverPanel.tsx
  ExplainDifferentlyPanel.tsx
  FlashcardPanel.tsx
  FlashcardDeckView.tsx
  QuizPanel.tsx

src/services/
  learningService.ts

src/utils/
  studyStorage.ts
  studyPrompts.ts

src/types/
  study.ts
```

If keeping scope small:
- create `src/types/study.ts`
- create `src/services/learningService.ts`
- create `src/components/study/*`

## Prompt and Quality Guardrails

To make output genuinely high quality:

1. Use structured JSON responses for all study tools
2. Validate parsed responses before rendering
3. Keep prompts scoped to module content
4. Prefer "say you do not know" over hallucination
5. Add short style rubrics to every prompt

Examples of quality rules:
- answer clearly in under 250 words unless asked for depth
- define jargon before using it
- give one concrete example when useful
- explicitly mention uncertainty if context is weak
- do not repeat the question back verbatim

## What To Avoid

Do not:
- put all new logic into `bookService.ts`
- make Q&A global across the whole book only
- use the full `finalBook` as default prompt context for every interaction
- add a big spaced repetition engine before validating flashcard usage
- build quiz scoring complexity before collecting user behavior

## Success Metrics

Track these after shipping Tier 1:

- completed-book readers who use doubt resolver
- avg questions asked per reading session
- explain-differently usage per active user
- flashcard generation rate per completed module
- 7-day return rate after flashcard generation
- time spent in read mode vs overview mode

Target signal:
- users spend more time in completed-book reading
- users come back for flashcards
- users ask multiple questions per module

## Agent Execution Plan

Any AI agent working on this roadmap should use this order:

1. Refactor the reader to be module-aware
2. Create `study.ts` types and `learningService.ts`
3. Implement doubt resolver UI and service
4. Add explain-differently transforms on top of the same panel
5. Add flashcard generation and local deck persistence
6. Only then move to quizzes and adaptive study

## Concrete Task Breakdown

### Task A: Reader Refactor

- Add `selectedModuleIndex` in `BookView`
- Render active module content instead of only `finalBook`
- Keep a toggle for full-book reading if desired
- Update reading progress to store active module index cleanly

### Task B: Study Domain

- Add `src/types/study.ts`
- Add `src/services/learningService.ts`
- Add persistence helpers for study artifacts

### Task C: Doubt Resolver

- Add study panel shell
- Add question input
- Add loading/error/history states
- Add proxy/provider task support
- Add structured answer parsing

### Task D: Explain Differently

- Add six explanation modes
- Reuse doubt panel rendering
- Support selected text and module context

### Task E: Flashcards

- Add deck generator
- Add deck storage
- Add study UI with confidence buttons

### Task F: Telemetry and Quality

- Add event logging hooks
- Add response rating UI
- Track retries, failures, and usage depth

## Definition of Done For Tier 1

Tier 1 is done when:

- Completed books are readable module by module
- Users can ask doubts per module
- Users can re-explain difficult content in 6 ways
- Users can generate and revisit flashcards per module
- All three features have solid loading, retry, and persistence behavior
- Mobile UX is acceptable

## Best First Release Slice

If you want the best retention-to-effort ratio, ship this exact slice first:

1. Module-aware reader
2. Doubt resolver
3. Explain differently

Then ship flashcards right after.

That gets you:
- interactive tutor behavior
- visible intelligence
- stronger study value
- better retention loop

## Suggested Agent Prompt

Use this with another agent:

```text
Implement Tier 1 of the Study Companion roadmap in Pustakam.

Constraints:
- Keep changes incremental and production-safe
- Do not overload bookService.ts; create a dedicated learningService.ts
- Refactor BookView so completed-book reading is module-aware
- Add a study panel for per-module doubt resolution
- Add 6 explain-differently modes using the same study panel shell
- Persist study history and flashcard decks locally using the existing persistence approach
- Handle loading, retry, and error states carefully
- Preserve existing reading, generation, and export flows

Start by auditing:
- src/components/BookView.tsx
- src/types/book.ts
- src/utils/readingProgress.ts
- src/utils/storage.ts
- src/utils/persistence.ts
- src/services/bookService.ts
- src/services/proxyService.ts
- src/services/providerService.ts

Deliver in this order:
1. Reader refactor
2. study.ts + learningService.ts
3. Doubt resolver
4. Explain differently
5. Flashcards
```

