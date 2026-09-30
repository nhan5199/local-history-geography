import { inject, Injectable } from '@angular/core';
import { FirebaseService } from '../../../core/firebase/firebase.service';

export interface PublishedLessonRecord {
  id: string;
  data: Record<string, unknown>;
}

/** Read access for future live lessons; current pages still use bundled samples. */
@Injectable({ providedIn: 'root' })
export class LessonRepository {
  private readonly firebase = inject(FirebaseService);

  async getPublishedLessons(): Promise<PublishedLessonRecord[]> {
    const [database, { ref, query, orderByChild, equalTo, limitToFirst, get }] =
      await Promise.all([this.firebase.getDatabase(), import('firebase/database')]);
    const snapshot = await get(query(
      ref(database, 'lessons'),
      orderByChild('published'),
      equalTo(true),
      limitToFirst(100),
    ));

    const lessons: PublishedLessonRecord[] = [];
    snapshot.forEach(child => {
      const data: unknown = child.val();
      if (child.key && data && typeof data === 'object' && !Array.isArray(data)) {
        lessons.push({ id: child.key, data: data as Record<string, unknown> });
      }
    });
    // Validate/map these records to Lesson before connecting them to the UI.
    return lessons;
  }
}
