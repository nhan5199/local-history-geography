import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, runInInjectionContext, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import type { LearningQuestion, QuestionSet } from '../../core/firebase/question.models';
import { DEMO_QUESTION_SETS } from '../questions/demo-question-sets';
import { isGameAnswerCorrect, type GameResponse } from './game-scoring';

interface MatchChoice { id: number; text: string }
interface MatchLine { left: number; right: number; path: string }
interface FillSlot { key: number; text: string; space: boolean }

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

@Component({
  selector: 'app-games-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './games-page.html',
  styleUrls: ['./games-page.scss', './games-stage.scss', './games-controls.scss', './games-interactions.scss'],
})
export class GamesPage {
  private readonly library = inject(QuestionLibraryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private loadId = 0;
  private drag: { pointerId: number; source: number; target: number; startX: number; startY: number; active: boolean; element: HTMLElement } | null = null;
  private matchObserver: ResizeObserver | null = null;
  private matchFrame = 0;

  readonly demoSets = DEMO_QUESTION_SETS.filter(set => set.mode === 'game');
  readonly sets = signal<QuestionSet[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly activeSet = signal<QuestionSet | null>(null);
  readonly rounds = signal<LearningQuestion[]>([]);
  readonly index = signal(0);
  readonly score = signal(0);
  readonly checked = signal(false);
  readonly correct = signal(false);
  readonly finished = signal(false);
  readonly displayOptions = signal<string[]>([]);
  readonly ordered = signal<string[]>([]);
  readonly matchChoices = signal<MatchChoice[]>([]);
  readonly matches = signal<(number | null)[]>([]);
  readonly selectedLeft = signal<number | null>(null);
  readonly selected = signal<string[]>([]);
  readonly filled = signal('');
  readonly dragging = signal<number | null>(null);
  readonly dropTarget = signal<number | null>(null);
  readonly dragOffset = signal({ x: 0, y: 0 });
  readonly matchLines = signal<MatchLine[]>([]);
  readonly fillSlots = computed<FillSlot[]>(() => {
    const typed = this.filled().normalize('NFC');
    const normalized = typed.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
    const answers = this.question()?.answers ?? [];
    const answer = (answers.find(value => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi') === normalized) ?? answers[0] ?? '').normalize('NFC');
    const model = this.graphemes(answer);
    const entered = this.graphemes(typed);
    const length = Math.max(model.length, entered.length);
    return Array.from({ length }, (_, key) => ({
      key, text: entered[key] && entered[key] !== ' ' ? entered[key] : '_',
      space: (model[key] === ' ' && !entered[key]) || entered[key] === ' ',
    }));
  });
  readonly question = computed(() => this.rounds()[this.index()] ?? null);
  readonly progress = computed(() => this.rounds().length ? Math.round((this.index() / this.rounds().length) * 100) : 0);
  readonly ready = computed(() => {
    const question = this.question();
    if (!question) return false;
    switch (question.type) {
      case 'single': case 'multiple': case 'yesno': return this.selected().length > 0;
      case 'order': return this.ordered().length > 0;
      case 'match': return this.matches().length === question.options.length && this.matches().every(id => id !== null);
      case 'fill': return !!this.filled().trim();
    }
  });

  constructor() {
    void this.load();
    this.destroyRef.onDestroy(() => this.clearInteractions());
  }

  private graphemes(value: string): string[] {
    return [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(value)].map(part => part.segment);
  }

  private clearInteractions(): void {
    this.cancelDrag();
    this.matchObserver?.disconnect();
    this.matchObserver = null;
    cancelAnimationFrame(this.matchFrame);
    window.removeEventListener('scroll', this.queueMatchLines, true);
    window.removeEventListener('resize', this.queueMatchLines);
    this.matchLines.set([]);
  }

  async load(): Promise<void> {
    const request = ++this.loadId;
    this.loading.set(true);
    this.error.set(false);
    try {
      const sets = await this.library.list('game');
      if (request === this.loadId && !this.destroyRef.destroyed) this.sets.set(sets);
    } catch {
      if (request === this.loadId && !this.destroyRef.destroyed) this.error.set(true);
    } finally {
      if (request === this.loadId && !this.destroyRef.destroyed) this.loading.set(false);
    }
  }

  start(set: QuestionSet): void {
    this.activeSet.set(set);
    this.rounds.set(shuffled(set.questions));
    this.index.set(0);
    this.score.set(0);
    this.finished.set(false);
    this.prepareQuestion();
    this.focusAfterRender('#question-title');
  }

  backToCatalog(): void {
    this.clearInteractions();
    this.activeSet.set(null);
    this.rounds.set([]);
    this.finished.set(false);
    this.checked.set(false);
    this.focusAfterRender('#game-catalog-title');
  }

  private prepareQuestion(): void {
    this.clearInteractions();
    const question = this.question();
    this.checked.set(false);
    this.correct.set(false);
    this.selected.set([]);
    this.filled.set('');
    this.selectedLeft.set(null);
    this.matches.set(question?.options.map(() => null) ?? []);
    this.displayOptions.set(shuffled(question?.options ?? []));
    this.ordered.set(shuffled(question?.options ?? []));
    this.matchChoices.set(shuffled((question?.answers ?? []).map((text, id) => ({ id, text }))));
    if (question?.type === 'match') this.focusAfterRender('.match-grid', false, () => this.observeMatches());
  }

  choose(value: string): void {
    if (this.checked()) return;
    const question = this.question();
    if (question?.type === 'multiple') {
      this.selected.update(values => values.includes(value) ? values.filter(item => item !== value) : [...values, value]);
    } else {
      this.selected.set([value]);
    }
  }

  isSelected(value: string): boolean { return this.selected().includes(value); }

  moveItem(from: number, to: number): void {
    if (this.checked() || to < 0 || to >= this.ordered().length || from === to) return;
    this.ordered.update(items => {
      const next = [...items];
      next.splice(to, 0, ...next.splice(from, 1));
      return next;
    });
  }

  orderPointerDown(event: PointerEvent, index: number): void {
    if (this.checked() || event.button !== 0) return;
    const element = event.currentTarget as HTMLElement;
    this.drag = { pointerId: event.pointerId, source: index, target: index, startX: event.clientX, startY: event.clientY, active: false, element };
    element.setPointerCapture(event.pointerId);
  }

  orderPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
    drag.active = true;
    this.dragging.set(drag.source);
    this.dragOffset.set({ x: event.clientX - drag.startX, y: event.clientY - drag.startY });
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-order-index]');
    let target = row ? Number(row.dataset['orderIndex']) : null;
    if (target === drag.source) {
      const list = drag.element.closest('.order-list');
      const candidates = [...(list?.querySelectorAll<HTMLElement>('[data-order-index]') ?? [])];
      target = candidates.reduce<number | null>((closest, candidate) => {
        const index = Number(candidate.dataset['orderIndex']);
        const bounds = candidate.getBoundingClientRect();
        const center = bounds.top + bounds.height / 2 - (index === drag.source ? this.dragOffset().y : 0);
        if (closest === null) return index;
        const prior = candidates[closest].getBoundingClientRect();
        const priorCenter = prior.top + prior.height / 2 - (closest === drag.source ? this.dragOffset().y : 0);
        return Math.abs(event.clientY - center) < Math.abs(event.clientY - priorCenter) ? index : closest;
      }, null);
    }
    if (target !== null && Number.isInteger(target)) drag.target = target;
    this.dropTarget.set(target);
    event.preventDefault();
  }

  orderPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.active && this.dropTarget() !== null) this.moveItem(drag.source, drag.target);
    this.cancelDrag();
  }

  cancelDrag(): void {
    const drag = this.drag;
    this.drag = null;
    if (drag?.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
    this.dragging.set(null);
    this.dropTarget.set(null);
    this.dragOffset.set({ x: 0, y: 0 });
  }

  orderKeydown(event: KeyboardEvent, index: number): void {
    if (this.checked() || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const target = Math.max(0, Math.min(this.ordered().length - 1, index + (event.key === 'ArrowUp' ? -1 : 1)));
    if (target === index) return;
    this.moveItem(index, target);
    this.focusAfterRender(`[data-order-index="${target}"]`, false);
  }

  chooseLeft(index: number): void {
    if (this.checked()) return;
    if (this.matches()[index] !== null) {
      this.matches.update(items => items.map((id, position) => position === index ? null : id));
      this.selectedLeft.set(null);
    } else {
      this.selectedLeft.set(this.selectedLeft() === index ? null : index);
    }
    this.queueMatchLines();
  }

  chooseRight(id: number): void {
    const left = this.selectedLeft();
    if (this.checked()) return;
    if (left === null) {
      this.matches.update(items => items.map(assigned => assigned === id ? null : assigned));
      this.queueMatchLines();
      return;
    }
    this.matches.update(items => items.map((assigned, index) => index === left ? (assigned === id ? null : id) : assigned === id ? null : assigned));
    this.selectedLeft.set(null);
    this.queueMatchLines();
  }

  private observeMatches(): void {
    const grid = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('.match-grid');
    if (!grid) return;
    this.matchObserver = new ResizeObserver(this.queueMatchLines);
    this.matchObserver.observe(grid);
    grid.querySelectorAll('.match-card').forEach(card => this.matchObserver?.observe(card));
    window.addEventListener('scroll', this.queueMatchLines, true);
    window.addEventListener('resize', this.queueMatchLines);
    this.queueMatchLines();
  }

  private readonly queueMatchLines = (): void => {
    cancelAnimationFrame(this.matchFrame);
    this.matchFrame = requestAnimationFrame(() => this.measureMatchLines());
  };

  private measureMatchLines(): void {
    const grid = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('.match-grid');
    if (!grid) return;
    const bounds = grid.getBoundingClientRect();
    const lines: MatchLine[] = [];
    this.matches().forEach((id, left) => {
      if (id === null) return;
      const a = grid.querySelector<HTMLElement>(`[data-match-left="${left}"]`);
      const b = grid.querySelector<HTMLElement>(`[data-match-right="${id}"]`);
      if (!a || !b) return;
      const start = a.getBoundingClientRect();
      const end = b.getBoundingClientRect();
      const x1 = start.right - bounds.left;
      const x2 = end.left - bounds.left;
      const y1 = start.top + start.height / 2 - bounds.top;
      const y2 = end.top + end.height / 2 - bounds.top;
      const bend = Math.max(8, (x2 - x1) * .45);
      lines.push({ left, right: id, path: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}` });
    });
    this.matchLines.set(lines);
  }

  matchText(index: number): string {
    const id = this.matches()[index];
    return this.matchChoices().find(choice => choice.id === id)?.text ?? 'Chọn một thẻ bên phải';
  }

  rightAssigned(id: number): boolean { return this.matches().includes(id); }

  check(): void {
    const question = this.question();
    if (!question || this.checked() || !this.ready()) return;
    const response: GameResponse = {
      selected: this.selected(), ordered: this.ordered(),
      matched: this.matches().map(id => this.matchChoices().find(choice => choice.id === id)?.text ?? ''),
      filled: this.filled(),
    };
    const correct = isGameAnswerCorrect(question, response);
    this.correct.set(correct);
    this.checked.set(true);
    if (correct) this.score.update(points => points + 10);
  }

  next(): void {
    if (!this.checked()) return;
    if (this.index() + 1 >= this.rounds().length) {
      this.clearInteractions();
      this.finished.set(true);
      this.focusAfterRender('.result h1');
      return;
    }
    this.index.update(index => index + 1);
    this.prepareQuestion();
    this.focusAfterRender('#question-title');
  }

  private focusAfterRender(selector: string, scroll = true, callback?: () => void): void {
    runInInjectionContext(this.injector, () => afterNextRender(() => {
      const heading = (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
      if (scroll) {
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      } else if (!callback) heading?.focus({ preventScroll: true });
      callback?.();
    }));
  }

  answerText(question: LearningQuestion): string {
    return question.type === 'yesno'
      ? question.answers[0] === 'true' ? 'Đúng' : 'Sai'
      : question.type === 'match' ? question.options.map((left, index) => `${left} → ${question.answers[index]}`).join(' · ')
      : question.answers.join(question.type === 'order' ? ' → ' : ', ');
  }
}
