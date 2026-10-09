import {readFileSync} from 'node:fs';
import {createQuestionScope} from '../src/domain/questionScope.js';
const read=file=>JSON.parse(readFileSync(new URL(`../src/data/${file}`,import.meta.url),'utf8'));
const all=[...read('questions.json'),...read('trueFalse.json'),...read('additionalQuestions.json'),...read('conceptualQuestions.json'),...read('multipleAnswers.json')];
export const {isDeferredQuestion:isDeferred,activeQuestions:questions}=createQuestionScope(all,read('deferredQuestionIds.json'));
