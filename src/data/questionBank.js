import original from './questions.json';
import trueFalse from './trueFalse.json';
import additional from './additionalQuestions.json';
import conceptual from './conceptualQuestions.json';
import multipleAnswers from './multipleAnswers.json';
import deferredIds from './deferredQuestionIds.json';
import balanced from './balancedQuestions.json';
import retiredKeys from './retiredQuestionKeys.json';
import { createQuestionScope } from '../domain/questionScope.js';
// Keep the first 220 entries stable: existing local progress references these IDs.
// Full source order also preserves IDs for the 800-question local bank.
export const allBundledQuestions = [...original, ...trueFalse, ...additional, ...conceptual, ...multipleAnswers, ...balanced];
export const { isDeferredQuestion, activeQuestions: bundledQuestions } = createQuestionScope(allBundledQuestions, deferredIds, retiredKeys);
export const BANK_VERSION = '2026-10-09-contextual-1680';
