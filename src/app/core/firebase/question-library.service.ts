import { inject, Injectable } from '@angular/core';
import { RealtimeDatabaseService } from './realtime-database.service';
import { TeacherAuthService } from './teacher-auth.service';
import type { BankQuestion, LearningQuestion, QuestionSet, QuestionType } from './question.models';

export type QuestionMode = QuestionSet['mode'];
interface Catalog { sets: QuestionSet[]; occupied: Set<string> }
const TYPES: readonly QuestionType[] = ['single', 'multiple', 'yesno', 'order', 'match', 'fill'];
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const BANK_PAGE_SIZE = 25;

export function questionDifficulty(value: LearningQuestion): number {
  return value.difficulty ?? 1;
}

function cleanQuestion(value: LearningQuestion): LearningQuestion & { difficulty: number } {
  return {
    id: value.id, type: value.type, prompt: value.prompt, options: [...value.options],
    answers: [...value.answers], explanation: value.explanation, difficulty: questionDifficulty(value),
  };
}

function strings(value: unknown, maxCount: number, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxCount &&
    value.every(item => typeof item === 'string' && !!item.trim() && item.length <= maxLength);
}

/** Reject malformed records before displaying or publishing them. */
export function validateLearningQuestion(value: unknown, mode: QuestionMode): value is LearningQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  if (typeof q['id'] !== 'string' || !ID_PATTERN.test(q['id']) ||
      !TYPES.includes(q['type'] as QuestionType) ||
      (mode === 'questions' && !['single', 'multiple', 'yesno'].includes(q['type'] as string)) ||
      typeof q['prompt'] !== 'string' || !q['prompt'].trim() || q['prompt'].length > 500 ||
      typeof q['explanation'] !== 'string' || q['explanation'].length > 500 ||
      (q['difficulty'] !== undefined && (typeof q['difficulty'] !== 'number' || !Number.isInteger(q['difficulty']) ||
        (q['difficulty'] as number) < 1 || (q['difficulty'] as number) > 5)) ||
      !strings(q['options'], 10, 160) || !strings(q['answers'], 10, 160)) return false;
  const options = q['options'] as string[];
  const answers = q['answers'] as string[];
  if (new Set(options).size !== options.length) return false;
  switch (q['type']) {
    case 'single': case 'multiple':
      return options.length >= 2 && answers.length >= 1 &&
        (q['type'] === 'multiple' || answers.length === 1) &&
        new Set(answers).size === answers.length && answers.every(answer => options.includes(answer));
    case 'yesno':
      return options.length === 2 && options[0] === 'Đúng' && options[1] === 'Sai' &&
        answers.length === 1 && ['true', 'false'].includes(answers[0]);
    case 'order':
      return options.length >= 2 && answers.length === options.length &&
        new Set(answers).size === answers.length && answers.every(answer => options.includes(answer));
    case 'match':
      return options.length >= 2 && answers.length === options.length && new Set(answers).size === answers.length;
    case 'fill':
      return options.length === 0 && answers.length >= 1 && answers.length <= 5 &&
        new Set(answers.map(answer => answer.toLocaleLowerCase('vi'))).size === answers.length;
    default: return false;
  }
}

export function validateQuestionSet(id: string, value: unknown, mode: QuestionMode): QuestionSet | null {
  if (!new RegExp(`^${mode}-([0-9]|[12][0-9])$`).test(id) || !value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record['id'] !== id || record['mode'] !== mode || record['published'] !== true ||
      typeof record['title'] !== 'string' || !record['title'].trim() || record['title'].length > 120 ||
      typeof record['createdBy'] !== 'string' || !ID_PATTERN.test(record['createdBy']) ||
      typeof record['createdAt'] !== 'number' || !Number.isSafeInteger(record['createdAt']) ||
      record['createdAt'] <= 0 || !Array.isArray(record['questions']) ||
      record['questions'].length < 1 || record['questions'].length > 100) return null;
  // Realtime Database omits empty arrays. Restore fill options before validation.
  const questions = record['questions'].map((value: unknown) => {
    if (!value || typeof value !== 'object') return value;
    const question = value as Record<string, unknown>;
    return question['type'] === 'fill' && question['options'] === undefined
      ? { ...question, options: [] } : question;
  }) as LearningQuestion[];
  if (!questions.every(question => validateLearningQuestion(question, mode))) return null;
  if (new Set(questions.map(question => question.id)).size !== questions.length) return null;
  return { id, title: record['title'], mode, questions: questions.map(cleanQuestion),
    createdAt: record['createdAt'], createdBy: record['createdBy'] };
}

export function validateBankQuestion(id: string, value: unknown, mode: QuestionMode): BankQuestion | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const question = record['type'] === 'fill' && record['options'] === undefined
    ? { ...record, options: [] } : record;
  if (record['id'] !== id || record['mode'] !== mode ||
      typeof record['difficulty'] !== 'number' || !Number.isInteger(record['difficulty']) ||
      record['difficulty'] < 1 || record['difficulty'] > 5 ||
      typeof record['createdAt'] !== 'number' || !Number.isSafeInteger(record['createdAt']) ||
      record['createdAt'] <= 0 || typeof record['createdBy'] !== 'string' ||
      !ID_PATTERN.test(record['createdBy']) || !validateLearningQuestion(question, mode)) return null;
  return { ...cleanQuestion(question), mode, createdAt: record['createdAt'], createdBy: record['createdBy'] };
}

@Injectable({ providedIn: 'root' })
export class QuestionLibraryService {
  private readonly database = inject(RealtimeDatabaseService);
  private readonly auth = inject(TeacherAuthService);
  private readonly catalogs = new Map<QuestionMode, Promise<Catalog>>();
  private readonly bankCatalogs = new Map<QuestionMode, Promise<BankQuestion[]>>();
  private bankUid: string | null = null;

  /** At most one public, indexed, 30-record read per mode until this service publishes. */
  list(mode: QuestionMode): Promise<QuestionSet[]> {
    if (mode !== 'questions' && mode !== 'game') return Promise.reject(new Error('Chế độ câu hỏi không hợp lệ.'));
    return this.getCatalog(mode).then(catalog => catalog.sets);
  }

  /** Teacher-only, indexed 25-record pages. Continue until every bank entry is read. */
  async listBank(mode: QuestionMode, refresh = false): Promise<BankQuestion[]> {
    if (mode !== 'questions' && mode !== 'game') throw new Error('Chế độ câu hỏi không hợp lệ.');
    await this.auth.initialize();
    const user = this.auth.user();
    if (!user || !this.auth.isTeacher()) {
      this.bankUid = null;
      this.bankCatalogs.clear();
      throw new Error('Chỉ giáo viên được cấp quyền mới có thể xem ngân hàng câu hỏi.');
    }
    if (this.bankUid !== user.uid) {
      this.bankUid = user.uid;
      this.bankCatalogs.clear();
    }
    if (refresh) this.bankCatalogs.delete(mode);
    let pending = this.bankCatalogs.get(mode);
    if (!pending) {
      pending = this.readBank(mode).catch(error => {
        if (this.bankCatalogs.get(mode) === pending) this.bankCatalogs.delete(mode);
        throw error;
      });
      this.bankCatalogs.set(mode, pending);
    }
    const questions = await pending;
    if (this.auth.user()?.uid !== user.uid || !this.auth.isTeacher()) {
      if (this.bankUid === user.uid) this.bankCatalogs.clear();
      throw new Error('Phiên giáo viên đã thay đổi. Vui lòng tải lại ngân hàng câu hỏi.');
    }
    return questions;
  }

  private async readBank(mode: QuestionMode): Promise<BankQuestion[]> {
    const { orderByChild, limitToFirst, startAfter } = await import('firebase/database');
    const result: BankQuestion[] = [];
    let cursor: { timestamp: number; id: string } | null = null;
    for (;;) {
      const constraints = [orderByChild('createdAt'),
        ...(cursor ? [startAfter(cursor.timestamp, cursor.id)] : []), limitToFirst(BANK_PAGE_SIZE)];
      const entries = await this.database.readEntries(`questionBank/${mode}`, constraints);
      for (const [id, value] of entries) {
        const question = validateBankQuestion(id, value, mode);
        if (!question) throw new Error('Ngân hàng câu hỏi có dữ liệu không hợp lệ.');
        result.push(question);
      }
      if (entries.length < BANK_PAGE_SIZE) return result;
      const last = result.at(-1)!;
      if (cursor && (last.createdAt < cursor.timestamp ||
          (last.createdAt === cursor.timestamp && last.id === cursor.id))) {
        throw new Error('Không thể đọc tiếp ngân hàng câu hỏi.');
      }
      cursor = { timestamp: last.createdAt, id: last.id };
    }
  }

  private getCatalog(mode: QuestionMode): Promise<Catalog> {
    let pending = this.catalogs.get(mode);
    if (!pending) {
      pending = this.readCatalog(mode).catch(error => { this.catalogs.delete(mode); throw error; });
      this.catalogs.set(mode, pending);
    }
    return pending;
  }

  private async readCatalog(mode: QuestionMode): Promise<Catalog> {
    const { orderByChild, equalTo, limitToFirst } = await import('firebase/database');
    const raw = await this.database.read('questionSets', [orderByChild('mode'), equalTo(mode), limitToFirst(30)]);
    if (!raw || typeof raw !== 'object') return { sets: [], occupied: new Set() };
    const entries = Object.entries(raw).slice(0, 30);
    return { occupied: new Set(entries.map(([id]) => id)), sets: entries
      .map(([id, value]) => validateQuestionSet(id, value, mode))
      .filter((set): set is QuestionSet => set !== null) };
  }

  /** A single database write publishes a complete set; rules recheck editor identity and bounds. */
  async create(title: string, mode: QuestionMode, questions: LearningQuestion[]): Promise<string> {
    await this.auth.initialize();
    const user = this.auth.user();
    if (!user || !this.auth.isTeacher()) throw new Error('Chỉ giáo viên được cấp quyền mới có thể đăng câu hỏi.');
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length > 120 || (mode !== 'questions' && mode !== 'game')) {
      throw new Error('Tên bộ câu hỏi hoặc chế độ không hợp lệ.');
    }
    if (!Array.isArray(questions) || questions.length < 1 || questions.length > 100 ||
        !questions.every(question => validateLearningQuestion(question, mode)) ||
        new Set(questions.map(question => question.id)).size !== questions.length) {
      throw new Error('Bộ câu hỏi cần 1–100 câu hợp lệ, không trùng mã.');
    }
    let catalog = await this.getCatalog(mode);
    for (let attempts = 0; attempts < 30; attempts++) {
      const id = Array.from({ length: 30 }, (_, slot) => `${mode}-${slot}`)
        .find(candidate => !catalog.occupied.has(candidate));
      if (!id) break;
      try {
        await this.database.set(`questionSets/${id}`, {
          id, title: cleanTitle, mode, questions: questions.map(cleanQuestion),
          createdAt: Date.now(), createdBy: user.uid, published: true,
        });
        this.catalogs.delete(mode);
        return id;
      } catch (error) {
        // Another teacher may have claimed the same slot. Re-read before retrying.
        this.catalogs.delete(mode);
        catalog = await this.readCatalog(mode);
        if (!catalog.occupied.has(id)) throw error;
      }
    }
    throw new Error('Thư viện đã đủ 30 bộ cho chế độ này. Nhờ quản trị viên lưu trữ bộ cũ trước khi đăng thêm.');
  }

  /** Import one workbook to the private bank and optionally publish its questions as a test. */
  async importQuestions(title: string, mode: QuestionMode, questions: LearningQuestion[], createTest: boolean): Promise<string | null> {
    await this.auth.initialize();
    const user = this.auth.user();
    if (!user || !this.auth.isTeacher()) throw new Error('Chỉ giáo viên được cấp quyền mới có thể nhập câu hỏi.');
    const cleanTitle = title.trim();
    if ((createTest && !cleanTitle) || cleanTitle.length > 120 ||
        (mode !== 'questions' && mode !== 'game')) throw new Error('Tên bài kiểm tra hoặc chế độ không hợp lệ.');
    if (!Array.isArray(questions) || questions.length < 1 || questions.length > 100 ||
        !questions.every(question => validateLearningQuestion(question, mode)) ||
        new Set(questions.map(question => question.id)).size !== questions.length) {
      throw new Error('Tệp cần 1–100 câu hỏi hợp lệ, không trùng mã.');
    }
    const clean = questions.map(cleanQuestion);
    const stamp = Date.now();
    const bankChanges = async (): Promise<Record<string, unknown>> => {
      const existing = new Map((await this.listBank(mode, true)).map(question => [question.id, question]));
      const changes: Record<string, unknown> = {};
      for (const question of clean) {
        const previous = existing.get(question.id);
        if (previous) {
          if (JSON.stringify(cleanQuestion(previous)) !== JSON.stringify(question)) {
            throw new Error('Mã câu hỏi đã tồn tại với nội dung khác trong ngân hàng.');
          }
        } else {
          changes[`questionBank/${mode}/${question.id}`] = {
            ...question, mode, createdAt: stamp, createdBy: user.uid,
          } satisfies BankQuestion;
        }
      }
      return changes;
    };
    let changes = await bankChanges();
    if (!createTest) {
      try {
        if (Object.keys(changes).length) await this.database.updateRoot(changes);
      } finally {
        // A rejected acknowledgement may still follow a committed write.
        this.bankCatalogs.delete(mode);
      }
      return null;
    }
    let catalog = await this.getCatalog(mode);
    const findMatching = (candidate: Catalog): QuestionSet | undefined =>
      candidate.sets.find(set => set.title === cleanTitle && set.createdBy === user.uid &&
        JSON.stringify(set.questions) === JSON.stringify(clean));
    const matching = findMatching(catalog);
    if (matching) {
      try {
        if (Object.keys(changes).length) await this.database.updateRoot(changes);
      } catch (error) {
        this.bankCatalogs.delete(mode);
        if (Object.keys(await bankChanges()).length) throw error;
      }
      this.bankCatalogs.delete(mode);
      return matching.id;
    }
    for (let attempts = 0; attempts < 30; attempts++) {
      const id = Array.from({ length: 30 }, (_, slot) => `${mode}-${slot}`)
        .find(candidate => !catalog.occupied.has(candidate));
      if (!id) break;
      const payload = { ...changes, [`questionSets/${id}`]: {
        id, title: cleanTitle, mode, questions: clean, createdAt: stamp, createdBy: user.uid, published: true,
      } };
      try {
        await this.database.updateRoot(payload);
        this.catalogs.delete(mode);
        this.bankCatalogs.delete(mode);
        return id;
      } catch (error) {
        this.catalogs.delete(mode);
        this.bankCatalogs.delete(mode);
        catalog = await this.readCatalog(mode);
        changes = await bankChanges();
        const committed = findMatching(catalog);
        if (committed && !Object.keys(changes).length) return committed.id;
        if (!catalog.occupied.has(id)) throw error;
      }
    }
    throw new Error('Thư viện đã đủ 30 bộ cho chế độ này. Nhờ quản trị viên lưu trữ bộ cũ trước khi đăng thêm.');
  }
}
