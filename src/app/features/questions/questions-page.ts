import { Component, ElementRef, Injector, OnInit, afterNextRender, computed, inject, runInInjectionContext, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import { QUESTION_TYPE_LABELS, type LearningQuestion, type QuestionSet } from '../../core/firebase/question.models';
import { DEMO_QUESTION_SETS } from './demo-question-sets';

@Component({
  selector: 'app-questions-page',
  imports: [RouterLink],
  templateUrl: './questions-page.html',
  styleUrls: ['./questions-page.scss', './questions-results.scss'],
})
export class QuestionsPage implements OnInit {
  private readonly library = inject(QuestionLibraryService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  readonly labels = QUESTION_TYPE_LABELS;
  readonly demo = DEMO_QUESTION_SETS.find((set) => set.mode === 'questions')!;
  readonly sets = signal<QuestionSet[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly activeSet = signal<QuestionSet | null>(null);
  readonly selection = signal<Record<string, string[]>>({});
  readonly submitted = signal(false);
  readonly score = computed(() => {
    const questions = this.activeSet()?.questions ?? [];
    return {
      correct: questions.filter((question) => this.isCorrect(question)).length,
      unanswered: questions.filter((question) => !(this.selection()[question.id]?.length)).length,
      total: questions.length,
    };
  });

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.sets.set(await this.library.list('questions'));
    } catch {
      this.error.set('Chưa tải được danh sách bài tập. Em có thể thử lại sau.');
    } finally {
      this.loading.set(false);
    }
  }

  open(set: QuestionSet): void {
    this.activeSet.set(set);
    this.selection.set({});
    this.submitted.set(false);
    this.focusAfterRender('#active-set-title');
  }

  close(): void {
    this.activeSet.set(null);
    this.focusAfterRender('#question-catalog-title');
  }

  private focusAfterRender(selector: string): void {
    runInInjectionContext(this.injector, () => afterNextRender(() => {
      (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    }));
  }

  choose(question: LearningQuestion, option: string): void {
    if (this.submitted()) return;
    const value = question.type === 'yesno' ? (option === 'Đúng' ? 'true' : 'false') : option;
    const current = this.selection()[question.id] ?? [];
    const next = question.type === 'multiple'
      ? current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      : [value];
    this.selection.update((all) => ({ ...all, [question.id]: next }));
  }

  selected(question: LearningQuestion, option: string): boolean {
    const value = question.type === 'yesno' ? (option === 'Đúng' ? 'true' : 'false') : option;
    return (this.selection()[question.id] ?? []).includes(value);
  }

  correctOption(question: LearningQuestion, option: string): boolean {
    const value = question.type === 'yesno' ? (option === 'Đúng' ? 'true' : 'false') : option;
    return question.answers.includes(value);
  }

  submit(): void {
    if (this.submitted() || !this.activeSet()?.questions.length) return;
    this.submitted.set(true);
    this.focusAfterRender('#practice-result');
  }

  retry(): void {
    this.selection.set({});
    this.submitted.set(false);
    this.focusAfterRender('#active-set-title');
  }

  longOptions(question: LearningQuestion): boolean {
    return question.options.some((option) => option.length > 48 || option.split(/\s+/).some((word) => word.length > 24));
  }

  isCorrect(question: LearningQuestion): boolean {
    const chosen = this.selection()[question.id] ?? [];
    return chosen.length === question.answers.length &&
      chosen.every((answer) => question.answers.includes(answer));
  }

  correctAnswer(question: LearningQuestion): string {
    if (question.type === 'yesno') return question.answers[0] === 'true' ? 'Đúng' : 'Sai';
    return question.answers.join(', ');
  }
}
