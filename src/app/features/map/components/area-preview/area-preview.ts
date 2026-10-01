import { Component, computed, input, signal } from '@angular/core';
import type { MapRegion } from '../../models/map-region';

export interface AreaProfile { description: string; imageUrl?: string; imageAlt?: string; }

/** Add curated descriptions and local or Firebase download URLs by administrative code. */
export const AREA_PROFILES: Record<string, AreaProfile> = {};

export interface PreviewAnchor {
  x: number; y: number; minX: number; minY: number; maxX: number; maxY: number;
}

export function previewPlacement(anchor: PreviewAnchor) {
  const width = Math.min(260, Math.max(0, anchor.maxX - anchor.minX));
  const height = Math.min(240, Math.max(0, anchor.maxY - anchor.minY));
  const x = anchor.x + width + 18 <= anchor.maxX ? anchor.x + 18 : anchor.x - width - 18;
  const y = anchor.y + height + 18 <= anchor.maxY ? anchor.y + 18 : anchor.y - height - 18;
  return { x: Math.max(anchor.minX, Math.min(anchor.maxX - width, x)),
    y: Math.max(anchor.minY, Math.min(anchor.maxY - height, y)), width, height };
}

export function areaThumbnail(region: MapRegion, color: string): string {
  const bounds = region.bounds ?? [region.cx - 75, region.cy - 75, region.cx + 75, region.cy + 75];
  const width = bounds[2] - bounds[0], height = bounds[3] - bounds[1];
  const padding = Math.max(width, height) * .12;
  const escape = (text: string) => text.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds[0] - padding} ${bounds[1] - padding} ${width + padding * 2} ${height + padding * 2}"><path d="${escape(region.path)}" fill="${escape(color)}" fill-rule="evenodd" stroke="#50776b" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

@Component({
  selector: 'app-area-preview',
  template: `
    <div class="preview-image">
      <img [src]="imageUrl()" [alt]="imageAlt()" (error)="useThumbnail($event)" />
      @if (!hasPhoto()) { <span>Sơ đồ khu vực</span> }
    </div>
    <div class="preview-copy">
      <small>{{ region().type }} · {{ region().id }}</small>
      <strong>{{ region().name }}</strong>
      <p>{{ description() }}</p>
    </div>
  `,
  styleUrl: './area-preview.scss',
  host: { role: 'tooltip', id: 'map-area-preview' },
})
export class AreaPreview {
  readonly region = input.required<MapRegion>();
  readonly color = input('#bedacb');
  readonly profile = computed(() => AREA_PROFILES[this.region().id]);
  private readonly failedImageUrl = signal<string | null>(null);
  readonly hasPhoto = computed(() => !!this.profile()?.imageUrl && this.profile()?.imageUrl !== this.failedImageUrl());
  readonly thumbnail = computed(() => areaThumbnail(this.region(), this.color()));
  readonly imageUrl = computed(() => this.hasPhoto() ? this.profile()!.imageUrl! : this.thumbnail());
  readonly imageAlt = computed(() => this.hasPhoto()
    ? this.profile()?.imageAlt || `Ảnh ${this.region().name}`
    : `Sơ đồ ranh giới ${this.region().type.toLowerCase()} ${this.region().name}`);
  readonly description = computed(() => this.profile()?.description ||
    `${this.region().type} ${this.region().name} thuộc thành phố Đồng Nai. Sơ đồ thể hiện hình dáng ranh giới tham khảo của địa phương.`);

  useThumbnail(event: Event): void {
    this.failedImageUrl.set(this.profile()?.imageUrl ?? null);
    const image = event.target as HTMLImageElement;
    if (image.getAttribute('src') !== this.thumbnail()) image.src = this.thumbnail();
  }
}
