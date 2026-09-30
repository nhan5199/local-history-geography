import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LessonDetail } from './lesson-detail';

describe('lesson quiz', () => {
  const params = new BehaviorSubject(convertToParamMap({ id: 'read-a-neighborhood-map' }));

  beforeEach(async () => {
    params.next(convertToParamMap({ id: 'read-a-neighborhood-map' }));
    await TestBed.configureTestingModule({
      imports: [LessonDetail],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { paramMap: params.asObservable(), snapshot: { paramMap: params.value } } }],
    }).compileComponents();
  });

  it('checks answers and can try again', async () => {
    const fixture = TestBed.createComponent(LessonDetail);
    fixture.detectChanges();
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const check = page.querySelector<HTMLButtonElement>('.check-button')!;
    expect(check.disabled).toBe(true);

    const questions = page.querySelectorAll('.question');
    questions[0].querySelectorAll<HTMLButtonElement>('.choice')[0].click();
    questions[1].querySelectorAll<HTMLButtonElement>('.choice')[1].click();
    fixture.detectChanges();
    expect(check.disabled).toBe(false);
    check.click();
    fixture.detectChanges();
    expect(page.querySelector('[role="status"]')?.textContent).toContain('2 of 2');
    page.querySelector<HTMLButtonElement>('.secondary-button')!.click();
    fixture.detectChanges();
    expect(page.querySelector<HTMLButtonElement>('.check-button')?.disabled).toBe(true);
  });

  it('updates when the lesson route changes', async () => {
    const fixture = TestBed.createComponent(LessonDetail);
    fixture.detectChanges();
    params.next(convertToParamMap({ id: 'where-water-goes' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('Where does water go?');
  });
});
