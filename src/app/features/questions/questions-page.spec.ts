import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import type { QuestionSet } from '../../core/firebase/question.models';
import { QuestionsPage } from './questions-page';

async function createPage(list: () => Promise<QuestionSet[]>) {
  await TestBed.configureTestingModule({
    imports: [QuestionsPage],
    providers: [provideRouter([]), { provide: QuestionLibraryService, useValue: { list } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(QuestionsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, page: fixture.nativeElement as HTMLElement, component: fixture.componentInstance };
}

describe('QuestionsPage', () => {
  it('reveals correct choices and selected mistakes only after saving, and clears them on retry', async () => {
    const { fixture, page, component } = await createPage(() => Promise.resolve([]));
    component.open(component.demo);
    fixture.detectChanges();
    const questions = component.demo.questions;
    component.choose(questions[0], questions[0].options[1]);
    component.choose(questions[1], questions[1].options[0]);
    component.choose(questions[1], questions[1].options[2]);
    component.choose(questions[2], 'Sai');
    fixture.detectChanges();
    expect(page.querySelector('.answer-correct,.answer-wrong')).toBeNull();
    component.submit();
    fixture.detectChanges();
    expect(page.querySelectorAll('.answer-wrong')).toHaveLength(3);
    expect(page.querySelectorAll('.answer-correct')).toHaveLength(4);
    const yesno = page.querySelectorAll('.question-card')[2];
    expect(yesno.querySelector('.answer-correct')?.textContent).toContain('Đúng');
    expect(yesno.querySelector('.answer-wrong')?.textContent).toContain('Sai');
    component.retry();
    fixture.detectChanges();
    expect(page.querySelector('.answer-correct,.answer-wrong')).toBeNull();
  });
  it('shows a catalog error and opens the sample only on request', async () => {
    const { fixture, page } = await createPage(() => Promise.reject(new Error('offline')));
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('Chưa tải được');
    expect(page.querySelector('.question-card')).toBeNull();
    page.querySelector<HTMLButtonElement>('.demo-button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.querySelectorAll('.question-card')).toHaveLength(3);
    expect(document.activeElement).toBe(page.querySelector('#active-set-title'));
    page.querySelector<HTMLButtonElement>('.back')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(page.querySelector('#question-catalog-title'));
  });

  it('grades the whole test once, counting unanswered questions, only after saving', async () => {
    const { fixture, page, component } = await createPage(() => Promise.resolve([]));
    page.querySelector<HTMLButtonElement>('.demo-button')!.click();
    fixture.detectChanges();
    const cards = page.querySelectorAll<HTMLElement>('.question-card');
    cards[0].querySelector<HTMLInputElement>('input')!.click();
    cards[1].querySelector<HTMLInputElement>('input')!.click();
    fixture.detectChanges();
    expect(page.querySelector('.feedback')).toBeNull();
    expect(page.querySelector('.result')).toBeNull();
    expect(page.querySelectorAll('.submit')).toHaveLength(1);
    expect(cards[0].querySelector('input')?.type).toBe('radio');
    expect(cards[1].querySelector('input')?.type).toBe('checkbox');

    page.querySelector<HTMLButtonElement>('.submit')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.querySelector('.result')?.textContent).toContain('1/3 câu');
    expect(page.querySelector('.result')?.textContent).toContain('1 câu chưa trả lời');
    expect(page.querySelectorAll('.feedback')).toHaveLength(3);
    expect(cards[2].querySelector('.feedback')?.textContent).toContain('chưa trả lời');
    expect(cards[2].querySelector('.feedback')?.textContent).toContain('Đáp án đúng: Đúng');
    expect(page.querySelectorAll('input:disabled')).toHaveLength(8);
    expect(document.activeElement).toBe(page.querySelector('#practice-result'));
    component.submit();
    fixture.detectChanges();
    expect(page.querySelector('.result')?.textContent).toContain('1/3 câu');
  });

  it('resets all answers and changes sets without carrying over results', async () => {
    const other: QuestionSet = {
      id: 'other', title: 'Bộ khác', mode: 'questions', createdAt: 1, createdBy: 'teacher',
      questions: [{ id: 'q', type: 'yesno', prompt: 'Đúng hay sai?', options: ['Đúng', 'Sai'], answers: ['false'], explanation: '' }],
    };
    const { fixture, page } = await createPage(() => Promise.resolve([other]));
    page.querySelector<HTMLButtonElement>('.demo-button')!.click();
    fixture.detectChanges();
    page.querySelector<HTMLInputElement>('.question-card input')!.click();
    page.querySelector<HTMLButtonElement>('.submit')!.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.submit')!.click();
    fixture.detectChanges();
    expect(page.querySelectorAll('input:checked')).toHaveLength(0);
    expect(page.querySelector('.result')).toBeNull();
    expect(page.querySelector('.feedback')).toBeNull();
    expect(page.querySelectorAll('input:disabled')).toHaveLength(0);
    page.querySelector<HTMLButtonElement>('.back')!.click();
    fixture.detectChanges();
    page.querySelector<HTMLButtonElement>('.set-card')!.click();
    fixture.detectChanges();
    expect(page.querySelector('#active-set-title')?.textContent).toContain('Bộ khác');
    expect(page.querySelector('.result')).toBeNull();
  });

  it('switches the entire choice grid to one column when an option is long', async () => {
    const set: QuestionSet = {
      id: 'layout', title: 'Bố cục', mode: 'questions', createdAt: 1, createdBy: 'teacher',
      questions: [
        { id: 'short', type: 'single', prompt: 'Ngắn', options: ['Một', 'Hai', 'Ba', 'Bốn'], answers: ['Một'], explanation: '' },
        { id: 'long', type: 'multiple', prompt: 'Dài', options: ['Một', 'Hai', 'Một lựa chọn dài hơn bốn mươi tám ký tự để được hiển thị trên cả hàng', 'Bốn'], answers: ['Một'], explanation: '' },
      ],
    };
    const { fixture, page } = await createPage(() => Promise.resolve([set]));
    page.querySelector<HTMLButtonElement>('.set-card')!.click();
    fixture.detectChanges();
    const grids = page.querySelectorAll('.options');
    expect(grids[0].classList.contains('long-options')).toBe(false);
    expect(grids[1].classList.contains('long-options')).toBe(true);
    expect(grids[0].querySelectorAll('label.option')).toHaveLength(4);
    expect(grids[1].querySelectorAll('label.option')).toHaveLength(4);
  });
});
