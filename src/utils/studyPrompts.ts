import { ExplanationMode } from '../types/study';

export const EXPLANATION_MODE_LABELS: Record<ExplanationMode, string> = {
  simpler: 'Simpler',
  deeper: 'Deeper',
  step_by_step: 'Step by step',
  analogy: 'Analogy',
  exam_focused: 'Exam-focused',
  practical: 'Practical',
};

export interface StudyPromptContext {
  bookTitle: string;
  learningGoal: string;
  moduleTitle: string;
  moduleDescription?: string;
  moduleObjectives?: string[];
  moduleContent: string;
  previousModulesSummary: string;
}

const baseRules = [
  'Use the active module as the primary source of truth.',
  'Use previous module context only when it genuinely helps.',
  'If the answer is not well supported by the provided context, say so clearly.',
  'Teach the concept instead of sounding like a generic chatbot.',
  'Keep the response grounded in the module topic.',
  'Return valid JSON only. No markdown fences. No extra commentary.',
];

const trimBlock = (value: string, limit: number) => {
  const normalized = value.replace(/\r/g, '').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}\n...[truncated for prompt safety]`;
};

const renderContext = (context: StudyPromptContext) => [
  `BOOK TITLE: ${context.bookTitle}`,
  `LEARNING GOAL: ${context.learningGoal}`,
  `ACTIVE MODULE: ${context.moduleTitle}`,
  context.moduleDescription ? `MODULE DESCRIPTION: ${context.moduleDescription}` : null,
  context.moduleObjectives?.length
    ? `MODULE OBJECTIVES:\n${context.moduleObjectives.map(item => `- ${item}`).join('\n')}`
    : null,
  context.previousModulesSummary
    ? `PREVIOUS MODULES SUMMARY:\n${trimBlock(context.previousModulesSummary, 2200)}`
    : 'PREVIOUS MODULES SUMMARY: None',
  `ACTIVE MODULE CONTENT:\n${trimBlock(context.moduleContent, 12000)}`,
]
  .filter(Boolean)
  .join('\n\n');

export function buildDoubtPrompt(context: StudyPromptContext, question: string, selectedText?: string): string {
  return [
    'You are the in-book tutor for Pustakam.',
    ...baseRules,
    'Explain clearly in under 250 words unless the learner asked for more depth.',
    'Define jargon before using it.',
    'End with exactly two thoughtful follow-up questions.',
    '',
    renderContext(context),
    '',
    selectedText ? `SELECTED TEXT:\n${trimBlock(selectedText, 1200)}` : 'SELECTED TEXT: None',
    `LEARNER QUESTION: ${question.trim()}`,
    '',
    'Return this JSON shape:',
    '{"answer":"string","confidence":"high|medium|low","usedContext":["module"],"followUpSuggestions":["string","string"]}',
  ].join('\n');
}

export function buildReExplainPrompt(
  context: StudyPromptContext,
  mode: ExplanationMode,
  selectedText?: string
): string {
  return [
    'You are transforming a section of a study module for better understanding.',
    ...baseRules,
    `MODE: ${mode}`,
    'Keep the transformed explanation under 220 words.',
    'Preserve correctness. Do not drift into unrelated topics.',
    'If the selected text is too short, expand using the surrounding module context.',
    '',
    renderContext(context),
    '',
    selectedText
      ? `SELECTED TEXT TO TRANSFORM:\n${trimBlock(selectedText, 1800)}`
      : 'SELECTED TEXT TO TRANSFORM: Use the most important concept from the active module overview.',
    '',
    'Mode guidance:',
    '- simpler: reduce jargon and explain like a beginner',
    '- deeper: add conceptual depth and nuance',
    '- step_by_step: explain in a clear sequence',
    '- analogy: use a relatable analogy',
    '- exam_focused: highlight memory anchors and likely exam angles',
    '- practical: focus on concrete use cases and implementation',
    '',
    'Return this JSON shape:',
    '{"answer":"string","confidence":"high|medium|low","usedContext":["module"],"followUpSuggestions":["string","string"]}',
  ].join('\n');
}

export function buildFlashcardsPrompt(context: StudyPromptContext): string {
  return [
    'You generate flashcards for active recall.',
    ...baseRules,
    'Create 8 to 12 concise, non-duplicative cards.',
    'Focus on concepts, comparisons, causes, steps, or applications.',
    'Do not create trivia or cards that merely copy a sentence from the module.',
    '',
    renderContext(context),
    '',
    'Return this JSON shape:',
    '{"deckTitle":"string","cards":[{"front":"string","back":"string","difficulty":"easy|medium|hard","tags":["string"]}]}',
  ].join('\n');
}
