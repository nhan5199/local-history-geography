import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LessonList } from './lesson-list';

describe('lesson library', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LessonList], providers: [provideRouter([])] }).compileComponents();
  });

  it('filters by topic and search text', () => {
    const fixture = TestBed.createComponent(LessonList);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(4);

    const historyButton = [...page.querySelectorAll<HTMLButtonElement>('.filter-button')]
      .find(button => button.textContent?.trim() === 'History');
    historyButton?.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(2);

    const search = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'landmark';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(1);
    expect(page.querySelector('.lesson-card h3')?.textContent).toContain('Stories of a landmark');
  });
});
