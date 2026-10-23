import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LESSON_ROUTES } from '../../lessons.routes';
import { LessonList } from './lesson-list';

describe('lesson library', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LessonList], providers: [provideRouter(LESSON_ROUTES)] }).compileComponents();
  });

  it('opens the focused catalog, a lesson, and the return route while preserving home', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(harness.routeNativeElement?.querySelector('.hero')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('.primary-cta')?.getAttribute('href')).toBe('/lessons');

    await harness.navigateByUrl('/lessons');
    const catalog = harness.routeNativeElement!;
    expect(catalog.querySelector('.hero')).toBeNull();
    expect(catalog.querySelector('h1')?.textContent).toContain('Cùng khám phá bài học');
    expect(catalog.querySelectorAll('.lesson-card')).toHaveLength(4);
    expect(catalog.querySelector('.sample-pill')?.textContent).toContain('mẫu');
    const lessonUrl = catalog.querySelector('a.lesson-card')!.getAttribute('href')!;
    await harness.navigateByUrl(lessonUrl);
    expect(harness.routeNativeElement?.querySelector('.lesson-page')).not.toBeNull();
    const returnUrl = harness.routeNativeElement!.querySelector('.back-link')!.getAttribute('href')!;
    expect(returnUrl).toBe('/lessons');
    await harness.navigateByUrl(returnUrl);
    expect(harness.routeNativeElement?.querySelectorAll('.lesson-card')).toHaveLength(4);
  });

  it('filters by topic and search text', () => {
    const fixture = TestBed.createComponent(LessonList);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(4);

    const historyButton = [...page.querySelectorAll<HTMLButtonElement>('.filter-button')]
      .find(button => button.textContent?.trim() === 'Lịch sử');
    historyButton?.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(2);

    const search = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'landmark';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(1);
    expect(page.querySelector('.lesson-card h3')?.textContent).toContain('Stories of a landmark');
    search.value = 'no matching lesson';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(0);
    page.querySelector<HTMLButtonElement>('.empty-state button')!.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('.lesson-card')).toHaveLength(4);
    expect(search.value).toBe('');
  });
});
