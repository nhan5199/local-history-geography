import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { LessonCategory } from '../../models/lesson';
import { SAMPLE_LESSONS } from '../../data/sample-lessons';

type CategoryFilter = 'All lessons' | LessonCategory;

@Component({
  selector: 'app-lesson-list',
  imports: [RouterLink],
  templateUrl: './lesson-list.html',
  styleUrl: './lesson-list.scss',
})
export class LessonList implements AfterViewInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private revealObserver?: IntersectionObserver;
  readonly categories: CategoryFilter[] = ['All lessons', 'History', 'Geography'];
  readonly activeCategory = signal<CategoryFilter>('All lessons');
  readonly searchTerm = signal('');
  readonly lessons = computed(() => {
    const category = this.activeCategory();
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return SAMPLE_LESSONS.filter(
      (lesson) =>
        (category === 'All lessons' || lesson.category === category) &&
        (!query ||
          `${lesson.title} ${lesson.subtitle} ${lesson.category}`
            .toLocaleLowerCase()
            .includes(query)),
    );
  });

  setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  ngAfterViewInit(): void {
    if (
      typeof IntersectionObserver === 'undefined' ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    )
      return;

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          this.revealObserver?.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px 40px 0px' },
    );
    this.observeReveals();
  }

  ngAfterViewChecked(): void {
    this.observeReveals();
  }

  private observeReveals(): void {
    if (!this.revealObserver) return;
    const root = this.element.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-ready)').forEach((item) => {
      item.classList.add('is-ready');
      this.revealObserver?.observe(item);
    });
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }
}
