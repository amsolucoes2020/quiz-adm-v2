import { questionKey } from './questions.js';

// Add the new bundled entries without resetting profiles or replacing custom questions.
// Existing installations had 220 seed entries and no version marker.
export function upgradeLocalBank(input, questions, version) {
  const saved = input['settings/localBank'];
  if (saved?.version === version && saved.count === questions.length) return input;
  const data = { ...input };
  // Hot reload of the first conceptual preview briefly saved the active count
  // instead of the source count. Preserve original deletions when repairing it.
  const previousCount = saved?.version === '2026-09-24-concepts-551' && saved.count === 551
    ? 800 : saved?.count ?? 220;
  const seen = new Set(Object.entries(input).filter(([path, value]) => path.startsWith('questions/') && typeof value?.pergunta === 'string').map(([, value]) => questionKey(value)));
  for (let i = previousCount; i < questions.length; i++) {
    const question = questions[i];
    const path = `questions/local-${i}`;
    const key = questionKey(question);
    if (!data[path] && !seen.has(key)) {
      data[path] = question;
      seen.add(key);
    }
  }
  data['settings/localBank'] = { version, count: questions.length };
  return data;
}
