import { createEnvironmentInjector, Injector, runInInjectionContext, type EnvironmentInjector } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionLibraryService, validateLearningQuestion, validateQuestionSet } from './question-library.service';
import { RealtimeDatabaseService } from './realtime-database.service';
import { TeacherAuthService } from './teacher-auth.service';
import type { LearningQuestion } from './question.models';

const fill: LearningQuestion = {
  id: 'fill-1', type: 'fill', prompt: 'Điền hướng?', options: [], answers: ['Đông'], explanation: '',
};

describe('QuestionLibraryService', () => {
  const database = { read: vi.fn(), readEntries: vi.fn(), set: vi.fn(), updateRoot: vi.fn() };
  const auth = { initialize: vi.fn(), user: vi.fn(), isTeacher: vi.fn() };
  function service(): QuestionLibraryService {
    const injector = createEnvironmentInjector([
      { provide: RealtimeDatabaseService, useValue: database },
      { provide: TeacherAuthService, useValue: auth },
    ], Injector.NULL as EnvironmentInjector);
    return runInInjectionContext(injector, () => new QuestionLibraryService());
  }

  beforeEach(() => {
    vi.resetAllMocks();
    auth.initialize.mockResolvedValue(undefined);
    auth.user.mockReturnValue({ uid: 'teacher-1' });
    auth.isTeacher.mockReturnValue(true);
    database.set.mockResolvedValue(undefined);
    database.updateRoot.mockResolvedValue(undefined);
  });

  it('restores empty fill options removed by Realtime Database and caches the bounded catalog', async () => {
    database.read.mockResolvedValue({ 'game-1': {
      id: 'game-1', title: 'Bộ mẫu', mode: 'game', published: true, createdBy: 'teacher-1', createdAt: 1,
      questions: [{ ...fill, options: undefined }],
    } });
    const library = service();
    const [a, b] = await Promise.all([library.list('game'), library.list('game')]);
    expect(a).toEqual(b);
    expect(a[0].questions[0].options).toEqual([]);
    expect(a[0].questions[0].difficulty).toBe(1);
    expect(database.read).toHaveBeenCalledTimes(1);
    expect(database.read).toHaveBeenCalledWith('questionSets', expect.any(Array));
  });

  it('validates integer difficulty levels while accepting legacy omitted values', () => {
    expect(validateLearningQuestion(fill, 'game')).toBe(true);
    expect(validateLearningQuestion({ ...fill, difficulty: 1 }, 'game')).toBe(true);
    expect(validateLearningQuestion({ ...fill, difficulty: 5 }, 'game')).toBe(true);
    expect(validateLearningQuestion({ ...fill, difficulty: 0 }, 'game')).toBe(false);
    expect(validateLearningQuestion({ ...fill, difficulty: 2.5 }, 'game')).toBe(false);
    expect(validateLearningQuestion({ ...fill, difficulty: 6 }, 'game')).toBe(false);
  });

  it('reads every bank page in Firebase query order, including tied timestamps', async () => {
    const records = Array.from({ length: 26 }, (_, index) => ({
      ...fill, id: `q-${String(index).padStart(2, '0')}`, difficulty: index % 5 + 1,
      mode: 'game', createdAt: index < 2 ? 1 : index, createdBy: 'teacher-1',
    }));
    database.readEntries.mockResolvedValueOnce(records.slice(0, 25).map(q => [q.id, q]))
      .mockResolvedValueOnce([[records[25].id, records[25]]]);
    const library = service();
    const bank = await library.listBank('game');
    expect(bank.map(q => q.id)).toEqual(records.map(q => q.id));
    expect(database.readEntries).toHaveBeenCalledTimes(2);
    expect(database.readEntries).toHaveBeenNthCalledWith(2, 'questionBank/game', expect.any(Array));
    await library.listBank('game');
    expect(database.readEntries).toHaveBeenCalledTimes(2);
    auth.isTeacher.mockReturnValue(false);
    await expect(library.listBank('game')).rejects.toThrow('giáo viên');
  });

  it('imports bank entries and an optional test through one atomic root update', async () => {
    database.read.mockResolvedValue(null);
    database.readEntries.mockResolvedValue([]);
    const id = await service().importQuestions('Bài mới', 'game', [fill], true);
    expect(id).toBe('game-0');
    expect(database.updateRoot).toHaveBeenCalledTimes(1);
    expect(database.updateRoot).toHaveBeenCalledWith(expect.objectContaining({
      'questionBank/game/fill-1': expect.objectContaining({ id: 'fill-1', mode: 'game', difficulty: 1,
        createdBy: 'teacher-1' }),
      'questionSets/game-0': expect.objectContaining({ title: 'Bài mới',
        questions: [{ ...fill, difficulty: 1 }] }),
    }));
    expect(database.set).not.toHaveBeenCalled();
  });

  it('allows bank-only imports without a title and retries existing identical entries safely', async () => {
    const saved = { ...fill, difficulty: 1, mode: 'game', createdAt: 123, createdBy: 'teacher-1' };
    database.readEntries.mockResolvedValue([[fill.id, saved]]);
    const library = service();
    await expect(library.importQuestions('', 'game', [fill], false)).resolves.toBeNull();
    expect(database.updateRoot).not.toHaveBeenCalled();
    await expect(library.importQuestions('', 'game', [{ ...fill, prompt: 'Khác' }], false))
      .rejects.toThrow('tồn tại');
    expect(database.updateRoot).not.toHaveBeenCalled();
  });

  it('keeps bank cache invalid when a multi-path write fails', async () => {
    database.readEntries.mockResolvedValue([]);
    database.updateRoot.mockRejectedValueOnce(new Error('permission denied'));
    const library = service();
    await expect(library.importQuestions('', 'game', [fill], false)).rejects.toThrow('permission denied');
    expect(database.updateRoot).toHaveBeenCalledTimes(1);
    expect(database.set).not.toHaveBeenCalled();
  });

  it('recognizes an atomic import committed before its acknowledgement was lost', async () => {
    let committed: Record<string, any> | null = null;
    database.readEntries.mockImplementation(async () => committed
      ? [['fill-1', committed['questionBank/game/fill-1']]] : []);
    database.read.mockImplementation(async () => committed
      ? { 'game-0': committed['questionSets/game-0'] } : null);
    database.updateRoot.mockImplementationOnce(async payload => {
      committed = payload;
      throw new Error('connection lost');
    });
    const library = service();
    await expect(library.importQuestions('Bài mới', 'game', [fill], true)).resolves.toBe('game-0');
    expect(database.updateRoot).toHaveBeenCalledTimes(1);
    await expect(library.importQuestions('Bài mới', 'game', [fill], true)).resolves.toBe('game-0');
    expect(database.updateRoot).toHaveBeenCalledTimes(1);
  });

  it('invalidates the bank cache after a lost bank-only acknowledgement', async () => {
    let committed: Record<string, any> | null = null;
    database.readEntries.mockImplementation(async () => committed
      ? [['fill-1', committed['questionBank/game/fill-1']]] : []);
    database.updateRoot.mockImplementationOnce(async payload => {
      committed = payload;
      throw new Error('connection lost');
    });
    const library = service();
    await expect(library.importQuestions('', 'game', [fill], false)).rejects.toThrow('connection lost');
    await expect(library.importQuestions('', 'game', [fill], false)).resolves.toBeNull();
    expect(database.readEntries).toHaveBeenCalledTimes(2);
    expect(database.updateRoot).toHaveBeenCalledTimes(1);
  });

  it('rejects unpublished records and game-only types in question mode', () => {
    const record = { id: 'game-1', title: 'Bộ mẫu', mode: 'game', published: true,
      createdBy: 'teacher-1', createdAt: 1, questions: [fill] };
    expect(validateQuestionSet('game-1', record, 'game')?.questions).toHaveLength(1);
    expect(validateQuestionSet('game-1', { ...record, published: false }, 'game')).toBeNull();
    expect(validateQuestionSet('game-1', { ...record, mode: 'questions' }, 'questions')).toBeNull();
  });

  it('requires a teacher role before writing and publishes the complete set atomically', async () => {
    const library = service();
    auth.isTeacher.mockReturnValue(false);
    await expect(library.create('Bộ mẫu', 'game', [fill])).rejects.toThrow('giáo viên');
    expect(database.set).not.toHaveBeenCalled();
    auth.isTeacher.mockReturnValue(true);
    const id = await library.create(' Bộ mẫu ', 'game', [fill]);
    expect(database.set).toHaveBeenCalledWith(`questionSets/${id}`, expect.objectContaining({
      id, title: 'Bộ mẫu', mode: 'game', published: true,
      questions: [{ ...fill, difficulty: 1 }], createdBy: 'teacher-1',
    }));
  });

  it('reports a full 30-slot catalog without trying to write', async () => {
    database.read.mockResolvedValue(Object.fromEntries(
      Array.from({ length: 30 }, (_, slot) => [`game-${slot}`, { mode: 'game' }]),
    ));
    await expect(service().create('Bộ mới', 'game', [fill])).rejects.toThrow('đủ 30 bộ');
    expect(database.set).not.toHaveBeenCalled();
  });

  it('refreshes the catalog after a concurrent slot claim and uses the next free slot', async () => {
    database.read.mockResolvedValueOnce(null).mockResolvedValueOnce({ 'game-0': { mode: 'game' } });
    database.set.mockRejectedValueOnce(new Error('permission denied')).mockResolvedValueOnce(undefined);
    const id = await service().create('Bộ mới', 'game', [fill]);
    expect(id).toBe('game-1');
    expect(database.set).toHaveBeenCalledTimes(2);
  });
});
