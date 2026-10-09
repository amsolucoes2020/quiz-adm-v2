import {readFileSync} from 'node:fs';
import {createQuestionScope} from '../src/domain/questionScope.js';
const read=file=>JSON.parse(readFileSync(new URL(`../src/data/${file}`,import.meta.url),'utf8'));
export const {isDeferredQuestion:isDeferred,activeQuestions:questions}=createQuestionScope(read('balancedQuestions.json'),[],read('retiredQuestionKeys.json'));
