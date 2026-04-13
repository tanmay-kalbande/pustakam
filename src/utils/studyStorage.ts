import {
  FlashcardDeck,
  FlashcardFeedback,
  StudyAnalytics,
  StudyInteraction,
  StudyState,
  StudyThread,
  WeakArea,
  WeakAreaSignal,
} from '../types/study';
import { persistence } from './persistence';

const STUDY_STORAGE_PREFIX = 'pustakam-study-';

const createAnalytics = (): StudyAnalytics => ({
  questionsAsked: 0,
  reExplanationsRequested: 0,
  flashcardGenerations: 0,
  flashcardReviews: 0,
  updatedAt: new Date(),
});

const createEmptyState = (bookId: string): StudyState => ({
  bookId,
  threads: {},
  flashcardDecks: {},
  weakAreas: {},
  analytics: createAnalytics(),
  updatedAt: new Date(),
});

const reviveThread = (thread: StudyThread): StudyThread => ({
  ...thread,
  updatedAt: new Date(thread.updatedAt),
  interactions: (thread.interactions || []).map(interaction => ({
    ...interaction,
    createdAt: new Date(interaction.createdAt),
    question: interaction.question
      ? {
          ...interaction.question,
          createdAt: new Date(interaction.question.createdAt),
        }
      : undefined,
    answer: {
      ...interaction.answer,
      createdAt: new Date(interaction.answer.createdAt),
    },
  })),
});

const reviveDeck = (deck: FlashcardDeck): FlashcardDeck => ({
  ...deck,
  generatedAt: new Date(deck.generatedAt),
  lastReviewedAt: deck.lastReviewedAt ? new Date(deck.lastReviewedAt) : undefined,
  cards: deck.cards.map(card => ({
    ...card,
    lastReviewedAt: card.lastReviewedAt ? new Date(card.lastReviewedAt) : undefined,
  })),
});

const reviveWeakArea = (weakArea: WeakArea): WeakArea => ({
  ...weakArea,
  lastSeenAt: new Date(weakArea.lastSeenAt),
});

const reviveStudyState = (bookId: string, raw: StudyState | null): StudyState => {
  if (!raw) return createEmptyState(bookId);

  return {
    ...raw,
    updatedAt: new Date(raw.updatedAt),
    threads: Object.fromEntries(
      Object.entries(raw.threads || {}).map(([moduleId, thread]) => [moduleId, reviveThread(thread)])
    ),
    flashcardDecks: Object.fromEntries(
      Object.entries(raw.flashcardDecks || {}).map(([moduleId, deck]) => [moduleId, reviveDeck(deck)])
    ),
    weakAreas: Object.fromEntries(
      Object.entries(raw.weakAreas || {}).map(([id, weakArea]) => [id, reviveWeakArea(weakArea)])
    ),
    analytics: raw.analytics
      ? {
          ...raw.analytics,
          updatedAt: new Date(raw.analytics.updatedAt),
        }
      : createAnalytics(),
  };
};

const getStorageKey = (bookId: string) => `${STUDY_STORAGE_PREFIX}${bookId}`;

const mergeAnalytics = (
  analytics: StudyAnalytics,
  patch: Partial<Omit<StudyAnalytics, 'updatedAt'>>
): StudyAnalytics => ({
  ...analytics,
  ...patch,
  updatedAt: new Date(),
});

async function readState(bookId: string): Promise<StudyState> {
  const storageKey = getStorageKey(bookId);

  try {
    const persisted = await persistence.getStudyRecord<StudyState>(storageKey);
    if (persisted) {
      return reviveStudyState(bookId, persisted);
    }
  } catch (error) {
    console.warn('[StudyStorage] IndexedDB read failed, falling back to localStorage:', error);
  }

  try {
    const legacy = localStorage.getItem(storageKey);
    if (!legacy) return createEmptyState(bookId);

    const parsed = JSON.parse(legacy) as StudyState;
    const revived = reviveStudyState(bookId, parsed);
    void persistence.saveStudyRecord(storageKey, revived).catch(persistError => {
      console.warn('[StudyStorage] Failed to migrate local study state:', persistError);
    });
    return revived;
  } catch (error) {
    console.warn('[StudyStorage] Failed to read local study state:', error);
    return createEmptyState(bookId);
  }
}

async function writeState(state: StudyState): Promise<void> {
  const storageKey = getStorageKey(state.bookId);
  const payload = {
    ...state,
    updatedAt: new Date(),
  };

  try {
    await persistence.saveStudyRecord(storageKey, payload);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('[StudyStorage] IndexedDB save failed, using localStorage:', error);
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }
}

async function mutateState<T>(
  bookId: string,
  updater: (state: StudyState) => { state: StudyState; result: T }
): Promise<T> {
  const current = await readState(bookId);
  const { state, result } = updater(current);
  await writeState(state);
  return result;
}

function upsertWeakArea(
  weakAreas: Record<string, WeakArea>,
  bookId: string,
  moduleId: string,
  concept: string,
  signal: WeakAreaSignal
): Record<string, WeakArea> {
  const normalizedConcept = concept.trim().slice(0, 120);
  if (!normalizedConcept) return weakAreas;

  const key = `${moduleId}:${normalizedConcept.toLowerCase()}`;
  const existing = weakAreas[key];

  return {
    ...weakAreas,
    [key]: existing
      ? {
          ...existing,
          signalCount: existing.signalCount + 1,
          signals: Array.from(new Set([...existing.signals, signal])),
          lastSeenAt: new Date(),
        }
      : {
          id: key,
          bookId,
          moduleId,
          concept: normalizedConcept,
          signalCount: 1,
          signals: [signal],
          lastSeenAt: new Date(),
        },
  };
}

export const studyStorage = {
  async getStudyState(bookId: string): Promise<StudyState> {
    return readState(bookId);
  },

  async getModuleThread(bookId: string, moduleId: string): Promise<StudyThread | null> {
    const state = await readState(bookId);
    return state.threads[moduleId] || null;
  },

  async saveInteraction(
    bookId: string,
    moduleId: string,
    moduleTitle: string,
    interaction: StudyInteraction
  ): Promise<StudyThread> {
    return mutateState(bookId, current => {
      const existingThread = current.threads[moduleId];
      const nextThread: StudyThread = {
        id: existingThread?.id || `${bookId}:${moduleId}`,
        bookId,
        moduleId,
        moduleTitle,
        interactions: [...(existingThread?.interactions || []), interaction].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        ),
        updatedAt: new Date(),
      };

      const isDoubt = interaction.type === 'doubt';
      const nextState: StudyState = {
        ...current,
        threads: {
          ...current.threads,
          [moduleId]: nextThread,
        },
        weakAreas:
          interaction.answer.confidence === 'low'
            ? upsertWeakArea(
                current.weakAreas,
                bookId,
                moduleId,
                interaction.sourceText || interaction.question?.question || interaction.title,
                interaction.type === 'doubt' ? 'question' : 're_explain'
              )
            : current.weakAreas,
        analytics: mergeAnalytics(current.analytics, {
          questionsAsked: current.analytics.questionsAsked + (isDoubt ? 1 : 0),
          reExplanationsRequested:
            current.analytics.reExplanationsRequested + (isDoubt ? 0 : 1),
        }),
        updatedAt: new Date(),
      };

      return { state: nextState, result: nextThread };
    });
  },

  async saveFlashcardDeck(bookId: string, deck: FlashcardDeck): Promise<FlashcardDeck> {
    return mutateState(bookId, current => {
      const nextState: StudyState = {
        ...current,
        flashcardDecks: {
          ...current.flashcardDecks,
          [deck.moduleId]: deck,
        },
        analytics: mergeAnalytics(current.analytics, {
          flashcardGenerations: current.analytics.flashcardGenerations + 1,
        }),
        updatedAt: new Date(),
      };

      return { state: nextState, result: deck };
    });
  },

  async getFlashcardDeck(bookId: string, moduleId: string): Promise<FlashcardDeck | null> {
    const state = await readState(bookId);
    return state.flashcardDecks[moduleId] || null;
  },

  async recordFlashcardFeedback(
    bookId: string,
    moduleId: string,
    cardId: string,
    feedback: FlashcardFeedback
  ): Promise<FlashcardDeck | null> {
    return mutateState(bookId, current => {
      const deck = current.flashcardDecks[moduleId];
      if (!deck) {
        return { state: current, result: null };
      }

      let weakAreas = current.weakAreas;

      const nextDeck: FlashcardDeck = {
        ...deck,
        lastReviewedAt: new Date(),
        cards: deck.cards.map(card => {
          if (card.id !== cardId) return card;
          if (feedback === 'hard') {
            weakAreas = upsertWeakArea(current.weakAreas, bookId, moduleId, card.front, 'flashcard');
          }

          return {
            ...card,
            difficulty: feedback,
            reviewCount: (card.reviewCount || 0) + 1,
            lastReviewedAt: new Date(),
            confidenceHistory: [...(card.confidenceHistory || []), feedback].slice(-12),
          };
        }),
      };

      const nextState: StudyState = {
        ...current,
        flashcardDecks: {
          ...current.flashcardDecks,
          [moduleId]: nextDeck,
        },
        weakAreas,
        analytics: mergeAnalytics(current.analytics, {
          flashcardReviews: current.analytics.flashcardReviews + 1,
        }),
        updatedAt: new Date(),
      };

      return { state: nextState, result: nextDeck };
    });
  },

  async trackWeakArea(
    bookId: string,
    moduleId: string,
    concept: string,
    signal: WeakAreaSignal
  ): Promise<void> {
    await mutateState(bookId, current => ({
      state: {
        ...current,
        weakAreas: upsertWeakArea(current.weakAreas, bookId, moduleId, concept, signal),
        updatedAt: new Date(),
      },
      result: undefined,
    }));
  },

  async clearModuleThread(bookId: string, moduleId: string): Promise<void> {
    await mutateState(bookId, current => {
      const { [moduleId]: _, ...remainingThreads } = current.threads;
      return {
        state: {
          ...current,
          threads: remainingThreads,
          updatedAt: new Date(),
        },
        result: undefined,
      };
    });
  },

  async deleteStudyState(bookId: string): Promise<void> {
    const storageKey = getStorageKey(bookId);
    localStorage.removeItem(storageKey);
    try {
      await persistence.deleteStudyRecord(storageKey);
    } catch (error) {
      console.warn('[StudyStorage] Failed to delete study state:', error);
    }
  },
};
