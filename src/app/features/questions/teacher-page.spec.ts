import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TeacherAuthService } from '../../core/firebase/teacher-auth.service';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import { TeacherPage } from './teacher-page';

describe('TeacherPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('offers the template before login but keeps the importer behind teacher permission', async () => {
    const auth = {
      user: signal<unknown>(null), ready: signal(true), isTeacher: signal(false), error: signal(''),
      initialize: vi.fn(async () => {}), login: vi.fn(async () => {}), logout: vi.fn(async () => {}),
    };
    const library = { importQuestions: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [TeacherPage],
      providers: [
        provideRouter([]),
        { provide: TeacherAuthService, useValue: auth },
        { provide: QuestionLibraryService, useValue: library },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TeacherPage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('#question-file')).toBeNull();
    expect(page.querySelector<HTMLButtonElement>('.download')?.disabled).toBe(false);

    auth.user.set({ uid: 'teacher' });
    fixture.detectChanges();
    expect(page.textContent).toContain('Chưa có quyền biên tập');
    expect(page.querySelector('#question-file')).toBeNull();
    expect(library.importQuestions).not.toHaveBeenCalled();
  });

  it('saves a prepared preview to the bank once, then offers creating a test', async () => {
    const auth = {
      user: signal<unknown>({ uid: 'teacher' }), ready: signal(true), isTeacher: signal(true), error: signal(''),
      initialize: vi.fn(async () => {}), login: vi.fn(async () => {}), logout: vi.fn(async () => {}),
    };
    const library = { importQuestions: vi.fn(async () => null) };
    await TestBed.configureTestingModule({
      imports: [TeacherPage],
      providers: [
        provideRouter([]),
        { provide: TeacherAuthService, useValue: auth },
        { provide: QuestionLibraryService, useValue: library },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TeacherPage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.preview.set([{
      id: 'q-1', type: 'single', prompt: 'Sông nào mang tên tỉnh Đồng Nai?',
      options: ['Sông Đồng Nai', 'Sông Hồng'], answers: ['Sông Đồng Nai'], explanation: '', difficulty: 3,
    }]);
    fixture.detectChanges();
    expect(page.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(page.querySelector('tbody')?.textContent).toContain('3/5');
    expect(page.querySelector('#question-title')).toBeNull();
    const publish = page.querySelector<HTMLButtonElement>('.publish-row .primary')!;
    publish.click();
    publish.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(library.importQuestions).toHaveBeenCalledTimes(1);
    expect(library.importQuestions).toHaveBeenCalledWith('', 'questions', expect.any(Array), false);
    expect(fixture.componentInstance.preview()).toHaveLength(0);

    page.querySelectorAll<HTMLInputElement>('.import-choice input')[1].click();
    fixture.detectChanges();
    const title = page.querySelector<HTMLInputElement>('#question-title')!;
    title.value = 'Khám phá Đồng Nai';
    title.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.createTest()).toBe(true);
    fixture.componentInstance.preview.set([{
      id: 'q-2', type: 'single', prompt: 'Hướng mặt trời mọc?',
      options: ['Đông', 'Tây'], answers: ['Đông'], explanation: '', difficulty: 1,
    }]);
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.publish-row .primary')!.click();
    await fixture.whenStable();
    expect(library.importQuestions).toHaveBeenCalledWith('Khám phá Đồng Nai', 'questions', expect.any(Array), true);

    page.querySelectorAll<HTMLButtonElement>('.mode-switch button')[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('game');
    expect(fixture.componentInstance.preview()).toHaveLength(0);
    expect(fixture.componentInstance.createTest()).toBe(false);
  });
});
