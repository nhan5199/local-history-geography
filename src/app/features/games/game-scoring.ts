import type { LearningQuestion } from '../../core/firebase/question.models';

export interface GameResponse {
  selected: string[];
  ordered: string[];
  matched: string[];
  filled: string;
}

const normalize = (value: string): string => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

export function isGameAnswerCorrect(question: LearningQuestion, response: GameResponse): boolean {
  const answers = question.answers;
  if (!answers.length) return false;
  switch (question.type) {
    case 'single':
    case 'yesno':
      return response.selected.length === 1 && answers.length === 1 && response.selected[0] === answers[0];
    case 'multiple': {
      const selected = [...response.selected].sort();
      const expected = [...answers].sort();
      return selected.length === expected.length && selected.every((answer, index) => answer === expected[index]);
    }
    case 'order':
      return response.ordered.length === answers.length && response.ordered.every((item, index) => item === answers[index]);
    case 'match':
      return response.matched.length === answers.length && response.matched.every((item, index) => item === answers[index]);
    case 'fill':
      return answers.map(normalize).includes(normalize(response.filled));
  }
}
