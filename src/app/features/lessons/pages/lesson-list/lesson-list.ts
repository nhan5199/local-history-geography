import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { LessonCategory } from '../../models/lesson';
import { SAMPLE_LESSONS } from '../../data/sample-lessons';
import { MapIllustration } from '../../components/map-illustration/map-illustration';

type CategoryFilter = 'All lessons' | LessonCategory;

@Component({
  selector: 'app-lesson-list',
  imports: [RouterLink, MapIllustration],
  templateUrl: './lesson-list.html',
  styleUrl: './lesson-list.scss',
})
export class LessonList {
  readonly categories: CategoryFilter[] = ['All lessons', 'History', 'Geography'];
  readonly activeCategory = signal<CategoryFilter>('All lessons');
  readonly searchTerm = signal('');
  readonly lessons = computed(() => {
    const category = this.activeCategory();
    const query = this.searchTerm().trim().toLocaleLowerCase();
    return SAMPLE_LESSONS.filter(lesson =>
      (category === 'All lessons' || lesson.category === category) &&
      (!query || `${lesson.title} ${lesson.subtitle} ${lesson.category}`.toLocaleLowerCase().includes(query))
    );
  });

  setSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }
}
