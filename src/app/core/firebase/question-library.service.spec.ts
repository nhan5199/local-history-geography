import { createEnvironmentInjector, Injector, runInInjectionContext, type EnvironmentInjector } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionLibraryService, validateQuestionSet } from './question-library.service';
import { RealtimeDatabaseService } from './realtime-database.service';
import { TeacherAuthService } from './teacher-auth.service';
import type { LearningQuestion } from './question.models';

const fill: LearningQuestion = {
  id: 'fill-1', type: 'fill', prompt: 'Điền hướng?', options: [], answers: ['Đông'], explanation: '',
};

describe('QuestionLibraryService', () => {
  const database = { read: vi.fn(), set: vi.fn() };
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
    expect(database.read).toHaveBeenCalledTimes(1);
    expect(database.read).toHaveBeenCalledWith('questionSets', expect.any(Array));
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
      id, title: 'Bộ mẫu', mode: 'game', published: true, questions: [fill], createdBy: 'teacher-1',
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
