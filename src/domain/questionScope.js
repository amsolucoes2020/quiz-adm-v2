import { questionKey } from './questions.js';

// Match content as well as seed IDs so an imported copy stays out of this edition.
export function createQuestionScope(questions, deferredIds, retiredKeys = []) {
  const keys = new Set([...deferredIds.map(id => questionKey(questions[id])), ...retiredKeys]);
  const isDeferredQuestion = question => question?.ativo === false || (typeof question?.pergunta === 'string' && keys.has(questionKey(question)));
  return { isDeferredQuestion, activeQuestions: questions.filter(question => !isDeferredQuestion(question)) };
}
