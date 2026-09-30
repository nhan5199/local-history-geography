import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { SAMPLE_LESSONS } from '../../data/sample-lessons';

@Component({
  selector: 'app-lesson-detail',
  imports: [RouterLink],
  templateUrl: './lesson-detail.html',
  styleUrl: './lesson-detail.scss',
})
export class LessonDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly lesson = computed(() => SAMPLE_LESSONS.find(item => item.id === this.routeParams().get('id')));
  readonly answers = signal<Record<number, number>>({});
  readonly submitted = signal(false);
  readonly allAnswered = computed(() => this.lesson()?.quiz.every((_, index) => this.answers()[index] !== undefined) ?? false);
  readonly score = computed(() => this.lesson()?.quiz.reduce((total, question, index) => total + Number(this.answers()[index] === question.answerIndex), 0) ?? 0);

  constructor() {
    effect(() => {
      this.lesson();
      this.tryAgain();
    });
  }

  choose(questionIndex: number, choiceIndex: number): void {
    if (!this.submitted()) this.answers.update(current => ({ ...current, [questionIndex]: choiceIndex }));
  }

  checkAnswers(): void {
    if (this.allAnswered()) this.submitted.set(true);
  }

  tryAgain(): void {
    this.answers.set({});
    this.submitted.set(false);
  }
}
