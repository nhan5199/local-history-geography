import { inject, Injectable } from '@angular/core';
import { RealtimeDatabaseService } from './realtime-database.service';
import { TeacherAuthService } from './teacher-auth.service';
import type { LearningQuestion, QuestionSet, QuestionType } from './question.models';

export type QuestionMode = QuestionSet['mode'];
interface Catalog { sets: QuestionSet[]; occupied: Set<string> }
const TYPES: readonly QuestionType[] = ['single', 'multiple', 'yesno', 'order', 'match', 'fill'];
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

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
  return { id, title: record['title'], mode, questions, createdAt: record['createdAt'], createdBy: record['createdBy'] };
}

@Injectable({ providedIn: 'root' })
export class QuestionLibraryService {
  private readonly database = inject(RealtimeDatabaseService);
  private readonly auth = inject(TeacherAuthService);
  private readonly catalogs = new Map<QuestionMode, Promise<Catalog>>();

  /** At most one public, indexed, 30-record read per mode until this service publishes. */
  list(mode: QuestionMode): Promise<QuestionSet[]> {
    if (mode !== 'questions' && mode !== 'game') return Promise.reject(new Error('Chế độ câu hỏi không hợp lệ.'));
    return this.getCatalog(mode).then(catalog => catalog.sets);
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
          id, title: cleanTitle, mode, questions, createdAt: Date.now(), createdBy: user.uid, published: true,
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
}
