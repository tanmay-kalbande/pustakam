export type ExplanationMode =
  | 'simpler'
  | 'deeper'
  | 'step_by_step'
  | 'analogy'
  | 'exam_focused'
  | 'practical';

export type StudyConfidence = 'high' | 'medium' | 'low';
export type FlashcardFeedback = 'easy' | 'medium' | 'hard';
export type WeakAreaSignal = 'question' | 're_explain' | 'flashcard';

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
  confidence?: StudyConfidence;
  followUpSuggestions?: string[];
  usedContext?: Array<'module' | 'previous_modules' | 'roadmap'>;
  createdAt: Date;
}

export interface StudyInteraction {
  id: string;
  bookId: string;
  moduleId: string;
  type: 'doubt' | 're_explain';
  title: string;
  sourceText?: string;
  mode?: ExplanationMode;
  question?: StudyQuestion;
  answer: StudyAnswer;
  createdAt: Date;
}

export interface StudyThread {
  id: string;
  bookId: string;
  moduleId: string;
  moduleTitle: string;
  interactions: StudyInteraction[];
  updatedAt: Date;
}

export interface Flashcard {
  id: string;
  moduleId: string;
  front: string;
  back: string;
  difficulty: FlashcardFeedback;
  tags?: string[];
  reviewCount?: number;
  lastReviewedAt?: Date;
  confidenceHistory?: FlashcardFeedback[];
}

export interface FlashcardDeck {
  id: string;
  bookId: string;
  moduleId: string;
  deckTitle: string;
  cards: Flashcard[];
  generatedAt: Date;
  sourceSummary?: string;
  lastReviewedAt?: Date;
}

export interface QuizQuestion {
  id: string;
  moduleId: string;
  prompt: string;
  type: 'multiple_choice' | 'short_answer' | 'own_words';
  options?: string[];
  answer?: string;
}

export interface QuizAttempt {
  id: string;
  bookId: string;
  moduleId: string;
  score: number;
  confidence: StudyConfidence;
  attemptedAt: Date;
}

export interface WeakArea {
  id: string;
  bookId: string;
  moduleId: string;
  concept: string;
  signalCount: number;
  signals: WeakAreaSignal[];
  lastSeenAt: Date;
}

export interface StudyAnalytics {
  questionsAsked: number;
  reExplanationsRequested: number;
  flashcardGenerations: number;
  flashcardReviews: number;
  updatedAt: Date;
}

export interface StudyState {
  bookId: string;
  threads: Record<string, StudyThread>;
  flashcardDecks: Record<string, FlashcardDeck>;
  weakAreas: Record<string, WeakArea>;
  analytics: StudyAnalytics;
  updatedAt: Date;
}
