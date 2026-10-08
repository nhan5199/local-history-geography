import { describe, expect, it } from 'vitest';
import * as xlsx from 'xlsx';
import { parseQuestionExcel } from './question-excel';

const headers = ['Loại câu hỏi', 'Câu hỏi', 'Lựa chọn', 'Đáp án', 'Giải thích'];

function workbookFile(rows: unknown[][]): File {
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, xlsx.utils.aoa_to_sheet([headers, ...rows]), 'Questions');
  return new File([xlsx.write(book, { type: 'array', bookType: 'xlsx' })], 'questions.xlsx');
}

describe('question Excel import', () => {
  it('normalizes and validates all six game question forms', async () => {
    const file = workbookFile([
      ['single', 'Một?', 'A|B', 'A', ''],
      ['multiple', 'Nhiều?', 'A|B|C', 'A|C', ''],
      ['yesno', 'Đúng không?', '', 'Sai', ''],
      ['order', 'Thứ tự?', '2|1|3', '1|2|3', ''],
      ['match', 'Ghép?', 'Một|Hai', '1|2', ''],
      ['fill', 'Điền?', '', 'Đông|hướng Đông', ''],
    ]);
    const questions = await parseQuestionExcel(file, 'game');
    expect(questions.map(question => question.type)).toEqual(['single', 'multiple', 'yesno', 'order', 'match', 'fill']);
    expect(questions[2].answers).toEqual(['false']);
    expect(questions[4].options.map((left, index) => [left, questions[4].answers[index]])).toEqual([['Một', '1'], ['Hai', '2']]);
    expect(questions[5].options).toEqual([]);
  });

  it('rejects game-only types and identifies the physical spreadsheet row', async () => {
    const file = workbookFile([
      ['single', 'Một?', 'A|B', 'A', ''],
      [],
      ['order', 'Thứ tự?', '2|1', '1|2', ''],
    ]);
    await expect(parseQuestionExcel(file, 'questions')).rejects.toThrow('Dòng 4');
  });

  it('rejects invalid answer alignment and formulas', async () => {
    await expect(parseQuestionExcel(workbookFile([
      ['match', 'Ghép?', 'Một|Hai', '1', ''],
    ]), 'game')).rejects.toThrow('Dòng 2');
    const book = xlsx.utils.book_new();
    const sheet = xlsx.utils.aoa_to_sheet([headers, ['single', 'Một?', 'A|B', 'A', '']]);
    sheet['B2'] = { t: 'n', f: '1+1', v: 2 };
    xlsx.utils.book_append_sheet(book, sheet, 'Questions');
    const file = new File([xlsx.write(book, { type: 'array', bookType: 'xlsx' })], 'formulas.xlsx');
    await expect(parseQuestionExcel(file, 'questions')).rejects.toThrow('công thức');
  });

  it('rejects rows beyond the 100-question limit instead of importing a prefix', async () => {
    const rows = Array.from({ length: 101 }, () => ['single', 'Một?', 'A|B', 'A', '']);
    await expect(parseQuestionExcel(workbookFile(rows), 'questions')).rejects.toThrow('100');
  });
});
