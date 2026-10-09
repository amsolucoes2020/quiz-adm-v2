import retiredKeys from './retiredQuestionKeys.json';
import {createQuestionScope} from '../domain/questionScope.js';
// Production only needs the retirement index, not the complete local seed bank.
export const {isDeferredQuestion}=createQuestionScope([],[],retiredKeys);
