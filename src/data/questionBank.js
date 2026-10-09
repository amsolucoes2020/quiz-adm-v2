import original from './questions.json';
import trueFalse from './trueFalse.json';
import additional from './additionalQuestions.json';
import conceptual from './conceptualQuestions.json';
import multipleAnswers from './multipleAnswers.json';
import deferredIds from './deferredQuestionIds.json';
import { createQuestionScope } from '../domain/questionScope.js';
// Keep the first 220 entries stable: existing local progress references these IDs.
// Full source order also preserves IDs for the 800-question local bank.
export const allBundledQuestions = [...original, ...trueFalse, ...additional, ...conceptual, ...multipleAnswers];
export const { isDeferredQuestion, activeQuestions: bundledQuestions } = createQuestionScope(allBundledQuestions, deferredIds);
export const BANK_VERSION = '2026-09-27-v1.4-561';
