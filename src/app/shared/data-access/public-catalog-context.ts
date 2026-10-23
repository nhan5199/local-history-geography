import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PublicCatalogContext {
  private readonly catalogs = new Map<PublicCatalogKind, readonly PublicCatalogEntry[]>();
  /** Public metadata only: no question answers, private banks, or network reads. */
  replace(kind: PublicCatalogKind, entries: readonly PublicCatalogEntry[]): void {
    this.catalogs.set(kind, entries.slice(0, 200).map(entry => ({
      id: entry.id.slice(0, 80), title: entry.title.slice(0, 120), description: entry.description.slice(0, 500),
    })));
  }
  entries() { return [...this.catalogs].flatMap(([kind, entries]) => entries.map(entry => ({ ...entry, kind }))); }
}
export interface PublicCatalogEntry { id: string; title: string; description: string; }
export type PublicCatalogKind = 'books' | 'panorama' | 'games' | 'questions' | 'map';
