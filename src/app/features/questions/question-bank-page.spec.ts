import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TeacherAuthService } from '../../core/firebase/teacher-auth.service';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import type { BankQuestion } from '../../core/firebase/question.models';
import { QuestionBankPage } from './question-bank-page';

const bank: BankQuestion[] = [
  { id: 'a', mode: 'questions', type: 'single', prompt: 'Sông Đồng Nai chảy qua đâu?', options: ['Đồng Nai', 'Hà Nội'], answers: ['Đồng Nai'], explanation: 'Qua Đồng Nai.', difficulty: 1, createdAt: 10, createdBy: 'teacher' },
  { id: 'b', mode: 'questions', type: 'yesno', prompt: 'Bản đồ thể hiện vị trí.', options: ['Đúng', 'Sai'], answers: ['true'], explanation: '', difficulty: 3, createdAt: 20, createdBy: 'teacher' },
  { id: 'c', mode: 'questions', type: 'single', prompt: 'Hướng mặt trời mọc?', options: ['Đông', 'Tây'], answers: ['Đông'], explanation: '', difficulty: 3, createdAt: 30, createdBy: 'teacher' },
];

describe('QuestionBankPage', () => {
  const auth = {
    user: signal<unknown>({ uid: 'teacher' }), ready: signal(true), isTeacher: signal(true),
    initialize: vi.fn(async () => {}),
  };
  const library = { listBank: vi.fn(async () => bank), create: vi.fn(async () => 'questions-0') };

  beforeEach(async () => {
    vi.clearAllMocks();
    auth.user.set({ uid: 'teacher' });
    auth.isTeacher.set(true);
    library.listBank.mockResolvedValue(bank);
    await TestBed.configureTestingModule({
      imports: [QuestionBankPage],
      providers: [provideRouter([]),
        { provide: TeacherAuthService, useValue: auth },
        { provide: QuestionLibraryService, useValue: library }],
    }).compileComponents();
  });

  it('keeps the bank private and reads only after teacher access', async () => {
    auth.user.set(null);
    auth.isTeacher.set(false);
    const fixture = TestBed.createComponent(QuestionBankPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(library.listBank).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Cần tài khoản giáo viên');
  });

  it('filters selection and prepares unique random questions without publishing', async () => {
    const fixture = TestBed.createComponent(QuestionBankPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    await vi.waitFor(() => expect(component.bank()).toHaveLength(3));
    expect(component.filtered().map(question => question.id)).toEqual(['c', 'b', 'a']);
    component.toggleQuestion('a');
    component.changeDifficulty('3');
    expect(component.selectedIds().size).toBe(0);
    expect(component.filtered().map(question => question.id)).toEqual(['c', 'b']);
    component.randomCount.set('2');
    component.prepareRandom();
    fixture.detectChanges();
    expect(new Set(component.preparedIds()).size).toBe(2);
    expect(component.prepared().every(question => question.difficulty === 3)).toBe(true);
    expect(library.create).not.toHaveBeenCalled();
    component.changeSearch('không có câu này');
    expect(component.prepared()).toHaveLength(0);
    expect(component.selectedIds().size).toBe(0);
  });

  it('publishes only an explicitly previewed set and retains difficulty', async () => {
    const fixture = TestBed.createComponent(QuestionBankPage);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    await vi.waitFor(() => expect(component.bank()).toHaveLength(3));
    component.title.set('Ôn tập Đồng Nai');
    await component.publish();
    expect(library.create).not.toHaveBeenCalled();
    component.toggleQuestion('a');
    component.prepareSelected();
    expect(component.preparedIds()).toEqual(['a']);
    await component.publish();
    expect(library.create).toHaveBeenCalledWith('Ôn tập Đồng Nai', 'questions', [{
      id: 'a', type: 'single', prompt: bank[0].prompt, options: bank[0].options,
      answers: bank[0].answers, explanation: bank[0].explanation, difficulty: 1,
    }]);
    expect(component.prepared()).toHaveLength(0);
  });
});
