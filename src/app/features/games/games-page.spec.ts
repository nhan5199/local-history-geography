import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import type { LearningQuestion, QuestionSet } from '../../core/firebase/question.models';
import { GamesPage } from './games-page';

const makeQuestion = (type: LearningQuestion['type'], options: string[], answers: string[]): LearningQuestion => ({
  id: type, type, prompt: 'Câu hỏi thử', options, answers, explanation: '',
});
const makeSet = (question: LearningQuestion): QuestionSet => ({
  id: 'test', title: 'Vòng thử', mode: 'game', questions: [question], createdAt: 1, createdBy: 'test',
});

async function open(question: LearningQuestion) {
  await TestBed.configureTestingModule({
    imports: [GamesPage],
    providers: [provideRouter([]), { provide: QuestionLibraryService, useValue: { list: async () => [] } }],
  }).compileComponents();
  const fixture = TestBed.createComponent(GamesPage);
  fixture.detectChanges();
  fixture.componentInstance.start(makeSet(question));
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement };
}

function pointer(type: string, x: number, y: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: 1 }, button: { value: 0 }, clientX: { value: x }, clientY: { value: y },
  });
  return event;
}

describe('GamesPage interactions', () => {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    Reflect.deleteProperty(document, 'elementFromPoint');
    if (originalScrollIntoView) HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    vi.unstubAllGlobals();
  });

  it('reorders on pointer release and supports focused keyboard movement', async () => {
    const { fixture, component, page } = await open(makeQuestion('order', ['Một', 'Hai', 'Ba'], ['Một', 'Hai', 'Ba']));
    const before = [...component.ordered()];
    const rows = page.querySelectorAll<HTMLElement>('[data-order-index]');
    rows[0].setPointerCapture = vi.fn();
    rows[0].hasPointerCapture = vi.fn(() => false);
    document.elementFromPoint = vi.fn(() => rows[1]);
    rows[0].dispatchEvent(pointer('pointerdown', 10, 10));
    rows[0].dispatchEvent(pointer('pointermove', 10, 60));
    fixture.detectChanges();
    expect(rows[1].classList.contains('is-drop-target')).toBe(true);
    rows[0].dispatchEvent(pointer('pointerup', 10, 60));
    fixture.detectChanges();
    expect(component.ordered()).toEqual([before[1], before[0], before[2]]);
    expect(page.querySelector('.move-controls')).toBeNull();

    page.querySelector<HTMLElement>('[data-order-index="1"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(component.ordered()).toEqual(before);
    fixture.destroy();
  });

  it('draws a connector, reassigns it, and removes it from either endpoint', async () => {
    const { fixture, component, page } = await open(makeQuestion('match', ['Trái A', 'Trái B'], ['Phải A', 'Phải B']));
    const grid = page.querySelector<HTMLElement>('.match-grid')!;
    const left = page.querySelectorAll<HTMLElement>('[data-match-left]');
    const right = page.querySelectorAll<HTMLElement>('[data-match-right]');
    grid.getBoundingClientRect = vi.fn(() => ({ left: 0, top: 0, right: 400, bottom: 200, width: 400, height: 200, x: 0, y: 0, toJSON: () => {} }));
    left.forEach((card, index) => { card.getBoundingClientRect = vi.fn(() => ({ left: 0, top: index * 70, right: 150, bottom: index * 70 + 60, width: 150, height: 60, x: 0, y: index * 70, toJSON: () => {} })); });
    right.forEach((card, index) => { card.getBoundingClientRect = vi.fn(() => ({ left: 250, top: index * 70, right: 400, bottom: index * 70 + 60, width: 150, height: 60, x: 250, y: index * 70, toJSON: () => {} })); });
    const id = Number(right[0].dataset['matchRight']);
    left[0].click(); fixture.detectChanges();
    right[0].click(); fixture.detectChanges();
    expect(page.querySelectorAll('.match-lines path')).toHaveLength(1);
    expect(page.querySelector('.match-lines path')?.getAttribute('d')).toContain('M 150 30');

    left[1].click(); fixture.detectChanges();
    right[0].click(); fixture.detectChanges();
    expect(component.matches()).toEqual([null, id]);
    expect(page.querySelectorAll('.match-lines path')).toHaveLength(1);
    right[0].click(); fixture.detectChanges();
    expect(component.matches()).toEqual([null, null]);
    expect(page.querySelectorAll('.match-lines path')).toHaveLength(0);
    left[0].click(); fixture.detectChanges();
    right[0].click(); fixture.detectChanges();
    left[0].click(); fixture.detectChanges();
    expect(component.matches()).toEqual([null, null]);
    fixture.destroy();
  });

  it('shows one slot per Vietnamese grapheme and accepts a longer answer variant', async () => {
    const { fixture, component, page } = await open(makeQuestion('fill', [], ['Đông', 'hướng Đông']));
    const input = page.querySelector<HTMLInputElement>('#game-fill')!;
    expect(page.querySelectorAll('.fill-slots span')).toHaveLength(4);
    input.value = 'Đo\u0302ng';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(component.filled().normalize('NFC')).toBe('Đông');
    expect(page.querySelectorAll('.fill-slots span')).toHaveLength(4);
    input.value = 'hướng đông';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(page.querySelectorAll('.fill-slots span')).toHaveLength(10);
    page.querySelector<HTMLButtonElement>('.action')!.click();
    expect(component.correct()).toBe(true);

    component.start(makeSet(makeQuestion('fill', [], ['Đồng Nai', 'Đồng'])));
    fixture.detectChanges();
    const shorter = page.querySelector<HTMLInputElement>('#game-fill')!;
    shorter.value = 'Đồng';
    shorter.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(page.querySelectorAll('.fill-slots span')).toHaveLength(4);
    expect([...page.querySelectorAll('.fill-slots span')].map(slot => slot.textContent).join('')).toBe('Đồng');
    fixture.destroy();
  });
});
