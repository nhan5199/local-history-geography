import { describe, expect, it } from 'vitest';
import type { LearningQuestion } from '../../core/firebase/question.models';
import { isGameAnswerCorrect, type GameResponse } from './game-scoring';

const question = (type: LearningQuestion['type'], answers: string[]): LearningQuestion => ({
  id: type, type, prompt: 'Câu hỏi', options: [], answers, explanation: '',
});
const response = (values: Partial<GameResponse>): GameResponse => ({
  selected: [], ordered: [], matched: [], filled: '', ...values,
});

describe('game answer scoring', () => {
  it('grades one, several, and yes/no selections', () => {
    expect(isGameAnswerCorrect(question('single', ['Sông Đồng Nai']), response({ selected: ['Sông Đồng Nai'] }))).toBe(true);
    expect(isGameAnswerCorrect(question('single', ['Sông Đồng Nai']), response({ selected: ['Sông Hồng'] }))).toBe(false);
    expect(isGameAnswerCorrect(question('multiple', ['Hồ Trị An', 'Trấn Biên']), response({ selected: ['Trấn Biên', 'Hồ Trị An'] }))).toBe(true);
    expect(isGameAnswerCorrect(question('multiple', ['Hồ Trị An', 'Trấn Biên']), response({ selected: ['Hồ Trị An'] }))).toBe(false);
    expect(isGameAnswerCorrect(question('yesno', ['true']), response({ selected: ['true'] }))).toBe(true);
    expect(isGameAnswerCorrect(question('yesno', ['false']), response({ selected: ['true'] }))).toBe(false);
  });

  it('requires the correct sequence and corresponding matches', () => {
    expect(isGameAnswerCorrect(question('order', ['Đồng', 'Nai']), response({ ordered: ['Đồng', 'Nai'] }))).toBe(true);
    expect(isGameAnswerCorrect(question('order', ['Đồng', 'Nai']), response({ ordered: ['Nai', 'Đồng'] }))).toBe(false);
    expect(isGameAnswerCorrect(question('match', ['Hồ nước', 'Di tích']), response({ matched: ['Hồ nước', 'Di tích'] }))).toBe(true);
    expect(isGameAnswerCorrect(question('match', ['Hồ nước', 'Di tích']), response({ matched: ['Di tích', 'Hồ nước'] }))).toBe(false);
  });

  it('distinguishes predefined labels that differ only by case', () => {
    const similarOptions = ['A', 'a'];
    const single = { ...question('single', ['A']), options: similarOptions };
    expect(isGameAnswerCorrect(single, response({ selected: ['a'] }))).toBe(false);
    expect(isGameAnswerCorrect(single, response({ selected: ['A'] }))).toBe(true);
    const multiple = { ...question('multiple', ['A', 'B']), options: ['A', 'a', 'B'] };
    expect(isGameAnswerCorrect(multiple, response({ selected: ['a', 'B'] }))).toBe(false);
    expect(isGameAnswerCorrect(question('order', similarOptions), response({ ordered: ['a', 'A'] }))).toBe(false);
    expect(isGameAnswerCorrect(question('match', similarOptions), response({ matched: ['a', 'A'] }))).toBe(false);
    expect(isGameAnswerCorrect(question('yesno', ['true']), response({ selected: ['True'] }))).toBe(false);
  });

  it('accepts a fill variant without surrounding spaces or case differences', () => {
    expect(isGameAnswerCorrect(question('fill', ['Đồng', 'đồng nai']), response({ filled: '  ĐỒNG NAI  ' }))).toBe(true);
    expect(isGameAnswerCorrect(question('fill', ['Đồng']), response({ filled: 'Hồng' }))).toBe(false);
    expect(isGameAnswerCorrect(question('fill', []), response({ filled: '' }))).toBe(false);
  });
});
