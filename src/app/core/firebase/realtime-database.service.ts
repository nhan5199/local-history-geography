import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { QueryConstraint } from 'firebase/database';
import { FirebaseService } from './firebase.service';

/** Values returned by Firebase need domain validation before use in a page. */
@Injectable({ providedIn: 'root' })
export class RealtimeDatabaseService {
  private readonly firebase = inject(FirebaseService);

  private async reference(path: string) {
    if (!path.replace(/\//g, '').trim()) throw new Error('Provide a non-root database path.');
    const [database, sdk] = await Promise.all([
      this.firebase.getDatabase(), import('firebase/database'),
    ]);
    return { sdk, reference: sdk.ref(database, path) };
  }

  async read(path: string, constraints: QueryConstraint[] = []): Promise<unknown> {
    const { sdk, reference } = await this.reference(path);
    const snapshot = await sdk.get(sdk.query(reference, ...constraints));
    return snapshot.val() as unknown;
  }

  /** Emits immediately and on changes; unsubscribing detaches the Firebase listener. */
  watch(path: string, constraints: QueryConstraint[] = []): Observable<unknown> {
    return new Observable(subscriber => {
      let unsubscribe: (() => void) | undefined;
      void this.reference(path).then(({ sdk, reference }) => {
        if (subscriber.closed) return;
        unsubscribe = sdk.onValue(sdk.query(reference, ...constraints),
          snapshot => subscriber.next(snapshot.val() as unknown),
          error => subscriber.error(error));
      }).catch(error => subscriber.error(error));
      return () => unsubscribe?.();
    });
  }

  /** Creates a record under a generated key and waits for server acknowledgement. */
  async push(path: string, value: unknown): Promise<string> {
    const { sdk, reference } = await this.reference(path);
    const child = sdk.push(reference);
    await sdk.set(child, value);
    return child.key!;
  }

  /** Replaces the entire value at this path. null deletes it. */
  async set(path: string, value: unknown): Promise<void> {
    const { sdk, reference } = await this.reference(path);
    await sdk.set(reference, value);
  }

  /** Updates selected fields, preserving siblings. null deletes a field. */
  async update(path: string, changes: Record<string, unknown>): Promise<void> {
    const { sdk, reference } = await this.reference(path);
    await sdk.update(reference, changes);
  }

  /** Preserve Firebase query order; snapshot.val() converts children to a plain object. */
  async readEntries(path: string, constraints: QueryConstraint[] = []): Promise<Array<[string, unknown]>> {
    const { sdk, reference } = await this.reference(path);
    const snapshot = await sdk.get(sdk.query(reference, ...constraints));
    const entries: Array<[string, unknown]> = [];
    snapshot.forEach(child => { entries.push([child.key!, child.val() as unknown]); });
    return entries;
  }

  /** Atomic updates across independent top-level paths, for bank imports and optional sets. */
  async updateRoot(changes: Record<string, unknown>): Promise<void> {
    const [database, sdk] = await Promise.all([
      this.firebase.getDatabase(), import('firebase/database'),
    ]);
    await sdk.update(sdk.ref(database), changes);
  }

  async remove(path: string): Promise<void> {
    const { sdk, reference } = await this.reference(path);
    await sdk.remove(reference);
  }
}
