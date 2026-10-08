import type { LearningQuestion, QuestionType } from './question.models';
import type { QuestionMode } from './question-library.service';
import { validateLearningQuestion } from './question-library.service';

const HEADERS = ['Loại câu hỏi', 'Câu hỏi', 'Lựa chọn', 'Đáp án', 'Giải thích'] as const;
const TYPES: QuestionType[] = ['single', 'multiple', 'yesno', 'order', 'match', 'fill'];
const TYPE_ALIASES: Record<string, QuestionType> = {
  single: 'single', multiple: 'multiple', yesno: 'yesno', order: 'order', match: 'match', fill: 'fill',
  'một đáp án': 'single', 'nhiều đáp án': 'multiple', 'đúng sai': 'yesno',
  'sắp xếp': 'order', 'ghép cặp': 'match', 'điền từ': 'fill',
};

function split(value: string): string[] {
  return value ? value.split('|').map(part => part.trim()) : [];
}

function textCell(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function checkZipEntries(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let expanded = 0;
  let entries = 0;
  for (let at = 0; at + 46 <= bytes.length; at++) {
    if (view.getUint32(at, true) !== 0x02014b50) continue;
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const uncompressed = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const next = at + 46 + nameLength + extraLength + commentLength;
    if (next > bytes.length || flags & 1 || (method !== 0 && method !== 8) || uncompressed === 0xffffffff) {
      throw new Error('Tệp .xlsx có cấu trúc nén không được hỗ trợ.');
    }
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (/vbaProject\.bin|macrosheets\//i.test(name)) throw new Error('Tệp có macro không được hỗ trợ.');
    expanded += uncompressed;
    if (expanded > 8 * 1024 * 1024 || ++entries > 200) throw new Error('Nội dung bảng tính quá lớn.');
    at = next - 1;
  }
  if (!entries) throw new Error('Tệp .xlsx không có danh mục ZIP hợp lệ.');
}

function parseRow(row: unknown[], number: number, mode: QuestionMode): LearningQuestion {
  const [rawType, rawPrompt, rawOptions, rawAnswers, rawExplanation] = row.map(textCell);
  const type = TYPE_ALIASES[rawType.toLocaleLowerCase('vi')];
  if (!type || (mode === 'questions' && !['single', 'multiple', 'yesno'].includes(type))) {
    throw new Error(`Dòng ${number}: loại câu hỏi không phù hợp. Dùng ${mode === 'questions' ? 'single, multiple, yesno' : TYPES.join(', ')}.`);
  }
  let options = split(rawOptions);
  let answers = split(rawAnswers);
  if (type === 'yesno') {
    if (options.length && (options.length !== 2 || options[0] !== 'Đúng' || options[1] !== 'Sai')) {
      throw new Error(`Dòng ${number}: câu Đúng/Sai để trống lựa chọn hoặc ghi Đúng|Sai.`);
    }
    options = ['Đúng', 'Sai'];
    if (answers.length === 1) {
      if (['đúng', 'true'].includes(answers[0].toLocaleLowerCase('vi'))) answers = ['true'];
      if (['sai', 'false'].includes(answers[0].toLocaleLowerCase('vi'))) answers = ['false'];
    }
  }
  const question: LearningQuestion = {
    id: crypto.randomUUID(), type, prompt: rawPrompt, options, answers, explanation: rawExplanation,
  };
  if (!validateLearningQuestion(question, mode)) {
    const detail: Record<QuestionType, string> = {
      single: 'cần ít nhất 2 lựa chọn và đúng 1 đáp án khớp lựa chọn.',
      multiple: 'cần ít nhất 2 lựa chọn và các đáp án khớp lựa chọn, không trùng nhau.',
      yesno: 'đáp án phải là Đúng hoặc Sai.',
      order: 'đáp án phải liệt kê mọi lựa chọn theo thứ tự đúng.',
      match: 'mỗi lựa chọn bên trái cần một đáp án bên phải ở cùng vị trí.',
      fill: 'để trống lựa chọn và ghi 1–5 đáp án được chấp nhận.',
    };
    throw new Error(`Dòng ${number}: ${detail[type]} Câu hỏi tối đa 500 ký tự; mỗi ô lựa chọn/đáp án tối đa 160 ký tự.`);
  }
  return question;
}

/** Parse a small, formula-free .xlsx workbook into validated questions. */
export async function parseQuestionExcel(file: File, mode: QuestionMode): Promise<LearningQuestion[]> {
  if (mode !== 'questions' && mode !== 'game') throw new Error('Chế độ câu hỏi không hợp lệ.');
  if (!/\.xlsx$/i.test(file.name) || !file.size || file.size > 2 * 1024 * 1024) {
    throw new Error('Chọn tệp .xlsx tối đa 2 MiB; không dùng tệp có macro.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error('Tệp không phải bảng tính .xlsx hợp lệ.');
  }
  checkZipEntries(bytes);
  const xlsx = await import('xlsx');
  let workbook: import('xlsx').WorkBook;
  try { workbook = xlsx.read(bytes, { type: 'array', WTF: true }); }
  catch { throw new Error('Không đọc được tệp .xlsx. Vui lòng dùng mẫu tải từ trang này.'); }
  for (const sheet of Object.values(workbook.Sheets)) {
    for (const cell of Object.values(sheet)) {
      if (cell && typeof cell === 'object' && 'f' in cell) throw new Error('Bảng tính không được chứa công thức.');
    }
  }
  const sheet = workbook.Sheets['Questions'] ?? workbook.Sheets['Câu hỏi'] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Không tìm thấy trang câu hỏi trong bảng tính.');
  const range = sheet['!ref'] ? xlsx.utils.decode_range(sheet['!ref']) : null;
  if (range && range.e.r > 100) {
    throw new Error('Mỗi tệp chỉ được tối đa 100 dòng câu hỏi (dòng 2–101).');
  }
  if (range && (range.s.r !== 0 || range.s.c !== 0)) throw new Error('Tiêu đề cột phải bắt đầu ở ô A1.');
  const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: true, raw: false });
  if (rows.length < 2) throw new Error('Bảng tính chưa có câu hỏi.');
  const actual = (rows[0] ?? []).slice(0, 5).map(textCell);
  if (HEADERS.some((header, index) => actual[index] !== header)) {
    throw new Error(`Dòng 1: tiêu đề cột phải là ${HEADERS.join(', ')}.`);
  }
  const nonempty = rows.slice(1).map((row, index) => ({ row, number: index + 2 }))
    .filter(({ row }) => row.some(value => textCell(value)));
  if (!nonempty.length) throw new Error('Bảng tính chưa có câu hỏi.');
  if (nonempty.length > 100) throw new Error('Mỗi tệp chỉ được tối đa 100 câu hỏi.');
  return nonempty.map(({ row, number }) => parseRow(row, number, mode));
}

/** Download a real XLSX workbook with a small example and instructions. */
export async function downloadQuestionTemplate(mode: QuestionMode): Promise<void> {
  if (mode !== 'questions' && mode !== 'game') throw new Error('Chế độ câu hỏi không hợp lệ.');
  const xlsx = await import('xlsx');
  const workbook = xlsx.utils.book_new();
  const instructions = [
    ['Mẫu câu hỏi', mode === 'questions' ? 'Ôn tập' : 'Trò chơi'],
    ['Cột', 'Loại câu hỏi | Câu hỏi | Lựa chọn | Đáp án | Giải thích'],
    ['Cách tách mục', 'Dùng dấu | giữa các lựa chọn hoặc đáp án; không đặt | trong một mục.'],
    ['single', 'Đáp án là một lựa chọn.'], ['multiple', 'Đáp án là các lựa chọn đúng, cách nhau bằng |.'],
    ['yesno', 'Để trống lựa chọn; đáp án ghi Đúng hoặc Sai.'],
    ['order', 'Đáp án liệt kê toàn bộ lựa chọn theo thứ tự đúng.'],
    ['match', 'Lựa chọn bên trái và đáp án bên phải cùng vị trí tạo thành một cặp.'],
    ['fill', 'Để trống lựa chọn; đáp án là các cách viết được chấp nhận.'],
    ['Giới hạn', 'Tối đa 100 câu, 2 MiB. Không dùng công thức hoặc macro.'],
  ];
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(instructions), 'Hướng dẫn');
  const examples = [
    ['single', 'Mặt trời mọc ở hướng nào?', 'Đông|Tây|Nam|Bắc', 'Đông', 'Mặt trời mọc ở hướng Đông.'],
    ['multiple', 'Chọn hai hướng chính.', 'Đông|Tây|Trên|Dưới', 'Đông|Tây', 'Đông và Tây là hướng chính.'],
    ['yesno', 'Bản đồ giúp tìm vị trí.', '', 'Đúng', 'Bản đồ thể hiện vị trí và phương hướng.'],
    ['order', 'Xếp các số tăng dần.', '2|1|3', '1|2|3', 'Tăng dần từ nhỏ đến lớn.'],
    ['match', 'Ghép các chữ với số.', 'Một|Hai', '1|2', 'Mỗi mục cùng vị trí là một cặp.'],
    ['fill', 'Điền hướng mặt trời mọc: ___.', '', 'Đông|hướng Đông', 'Mặt trời mọc ở hướng Đông.'],
  ];
  const allowed = mode === 'questions' ? examples.slice(0, 3) : examples;
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet([[...HEADERS], ...allowed]), 'Questions');
  const bytes = xlsx.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = mode === 'questions' ? 'mau-cau-hoi-on-tap.xlsx' : 'mau-cau-hoi-tro-choi.xlsx';
    document.body.append(link);
    link.click();
    link.remove();
  } finally { URL.revokeObjectURL(url); }
}
