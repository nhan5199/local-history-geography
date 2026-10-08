import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
    const library = { create: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [TeacherPage],
      providers: [
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
    expect(library.create).not.toHaveBeenCalled();
  });

  it('publishes a prepared preview once and clears the draft on mode change', async () => {
    const auth = {
      user: signal<unknown>({ uid: 'teacher' }), ready: signal(true), isTeacher: signal(true), error: signal(''),
      initialize: vi.fn(async () => {}), login: vi.fn(async () => {}), logout: vi.fn(async () => {}),
    };
    const library = { create: vi.fn(async () => 'set-1') };
    await TestBed.configureTestingModule({
      imports: [TeacherPage],
      providers: [
        { provide: TeacherAuthService, useValue: auth },
        { provide: QuestionLibraryService, useValue: library },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TeacherPage);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const title = page.querySelector<HTMLInputElement>('#question-title')!;
    title.value = 'Khám phá Đồng Nai';
    title.dispatchEvent(new Event('input'));
    fixture.componentInstance.preview.set([{
      id: 'q-1', type: 'single', prompt: 'Sông nào mang tên tỉnh Đồng Nai?',
      options: ['Sông Đồng Nai', 'Sông Hồng'], answers: ['Sông Đồng Nai'], explanation: '',
    }]);
    fixture.detectChanges();
    expect(page.querySelectorAll('tbody tr')).toHaveLength(1);
    const publish = page.querySelector<HTMLButtonElement>('.publish-row .primary')!;
    publish.click();
    publish.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(library.create).toHaveBeenCalledTimes(1);
    expect(library.create).toHaveBeenCalledWith('Khám phá Đồng Nai', 'questions', expect.any(Array));
    expect(fixture.componentInstance.preview()).toHaveLength(0);

    page.querySelectorAll<HTMLButtonElement>('.mode-switch button')[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.mode()).toBe('game');
    expect(fixture.componentInstance.preview()).toHaveLength(0);
  });
});
