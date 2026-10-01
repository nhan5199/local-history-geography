import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { AreaPreview, PreviewAnchor, previewPlacement } from '../../components/area-preview/area-preview';
import { MapMenu } from '../../components/map-menu/map-menu';
import type { MapRegion } from '../../models/map-region';

interface MapData {
  viewBox: string;
  regions: MapRegion[];
  sourceUrl: string;
  updatedAt: string;
  boundaryDate: string;
}

export function normalizeMapSearch(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function isMapData(value: unknown): value is MapData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<MapData>;
  if (
    data.viewBox !== '0 0 900 900' ||
    !Array.isArray(data.regions) ||
    data.regions.length === 0 ||
    typeof data.sourceUrl !== 'string' ||
    !data.sourceUrl.startsWith('https://') ||
    typeof data.updatedAt !== 'string' ||
    typeof data.boundaryDate !== 'string'
  ) return false;
  const ids = new Set<string>();
  return data.regions.every(region => {
    if (
      !region ||
      typeof region.id !== 'string' || !region.id ||
      typeof region.name !== 'string' || !region.name ||
      (region.type !== 'Phường' && region.type !== 'Xã') ||
      typeof region.path !== 'string' || !region.path ||
      !Number.isFinite(region.cx) || !Number.isFinite(region.cy) ||
      region.cx < 0 || region.cx > 900 || region.cy < 0 || region.cy > 900 ||
      ids.has(region.id)
    ) return false;
    ids.add(region.id);
    return true;
  });
}

@Component({
  selector: 'app-map-page',
  imports: [AreaPreview, MapMenu],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage implements OnInit, OnDestroy {
  @ViewChild('mapSvg') private mapSvg?: ElementRef<SVGSVGElement>;
  @ViewChild('mapStage') private mapStage?: ElementRef<HTMLDivElement>;
  @ViewChild(MapMenu) private menu?: MapMenu;
  @ViewChild('mapSearch') private mapSearch?: ElementRef<HTMLInputElement>;
  readonly menuOpen = signal(false);
  private searchFocusFrame?: number;

  readonly map = signal<MapData | null>(null);
  readonly loadState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly query = signal('');
  readonly showSearchResults = signal(false);
  readonly dragging = signal(false);
  readonly hoveredId = signal<string | null>(null);
  readonly previewAnchor = signal<PreviewAnchor | null>(null);
  readonly hoverPreview = computed(() => {
    if (this.dragging() || this.showSearchResults() || this.menuOpen()) return null;
    const anchor = this.previewAnchor();
    const region = this.map()?.regions.find(region => region.id === this.hoveredId());
    return anchor && region ? { region, ...previewPlacement(anchor) } : null;
  });
  readonly focusedId = signal<string | null>(null);
  readonly selectedRegion = signal<MapRegion | null>(null);
  readonly zoom = signal(1);
  readonly center = signal({ x: 450, y: 450 });
  readonly regionColors = computed(() => new Map(
    (this.map()?.regions ?? []).map((region, index) => [region.id, `hsl(${((index * 137.508) % 360).toFixed(2)} 53% 76%)`])
  ));
  readonly filteredRegions = computed(() => {
    const query = normalizeMapSearch(this.query());
    return (this.map()?.regions ?? []).filter(region =>
      !query || normalizeMapSearch(`${region.type} ${region.name} ${region.id}`).includes(query)
    );
  });
  readonly activeRegion = computed(() => {
    if (this.dragging()) return null;
    const id = this.hoveredId() ?? this.focusedId() ?? this.selectedRegion()?.id;
    return this.map()?.regions.find(region => region.id === id) ?? null;
  });
  readonly viewBox = computed(() => {
    const size = 900 / this.zoom();
    const { x, y } = this.center();
    const left = x - size / 2;
    const top = y - size / 2;
    return `${left} ${top} ${size} ${size}`;
  });
  private request?: AbortController;
  private selectionTrigger: HTMLElement | SVGElement | null = null;
  private frame?: number;
  private targetZoom?: number;
  private suppressClickUntil = 0;
  private pointer?: { id: number; x: number; y: number; centerX: number; centerY: number;
    unitX: number; unitY: number; svg: SVGSVGElement };

  ngOnInit(): void { this.loadMap(); }

  ngOnDestroy(): void {
    if (this.searchFocusFrame !== undefined) cancelAnimationFrame(this.searchFocusFrame);
    this.request?.abort();
    this.stopAnimation();
    this.endDrag();
  }

  async loadMap(): Promise<void> {
    this.menuOpen.set(false);
    this.hidePreview();
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this.loadState.set('loading');
    try {
      const url = new URL('maps/dong-nai.json', document.baseURI);
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok) throw new Error(`Map request failed: ${response.status}`);
      const data: unknown = await response.json();
      if (!isMapData(data)) throw new Error('Map data has an unexpected format');
      if (this.request !== request) return;
      this.map.set(data);
      this.loadState.set('ready');
    } catch (error) {
      if (request.signal.aborted || this.request !== request) return;
      console.error('Could not load the Đồng Nai map', error);
      this.loadState.set('error');
    }
  }

  setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.openSearch();
  }

  openSearch(): void { this.showSearchResults.set(true); }
  closeSearch(): void { this.showSearchResults.set(false); }

  @HostListener('document:pointerdown', ['$event'])
  onOutsidePointerDown(event: PointerEvent): void {
    if (!(event.target instanceof Element) || !event.target.closest('.search-control')) {
      if (this.searchFocusFrame !== undefined) {
        cancelAnimationFrame(this.searchFocusFrame);
        this.searchFocusFrame = undefined;
      }
      this.closeSearch();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.searchFocusFrame !== undefined) {
      cancelAnimationFrame(this.searchFocusFrame);
      this.searchFocusFrame = undefined;
    }
    if (this.menuOpen()) { this.menu?.close(true); return; }
    this.hidePreview();
    if (this.showSearchResults()) this.closeSearch();
    else this.closeSelection();
  }

  color(region: MapRegion): string { return this.regionColors().get(region.id) ?? '#c8bcde'; }

  onMenuChange(open: boolean): void {
    this.menuOpen.set(open);
    if (open) { this.closeSearch(); this.hidePreview(); }
  }

  onMenuAction(action: 'reset' | 'search' | 'map'): void {
    if (action === 'reset') this.resetView();
    if (action === 'search') {
      if (this.searchFocusFrame !== undefined) cancelAnimationFrame(this.searchFocusFrame);
      this.searchFocusFrame = requestAnimationFrame(() => {
        this.searchFocusFrame = undefined;
        this.mapSearch?.nativeElement.focus();
        this.openSearch();
      });
    }
  }

  onRegionHover(region: MapRegion, event: PointerEvent): void {
    if (event.pointerType === 'touch' || this.pointer || this.dragging()) return;
    const rect = this.mapStage?.nativeElement.getBoundingClientRect();
    if (!rect) return;
    this.hoveredId.set(region.id);
    this.previewAnchor.set({ x: event.clientX - rect.left, y: event.clientY - rect.top,
      minX: Math.max(8, 8 - rect.left), minY: Math.max(8, 8 - rect.top),
      maxX: Math.min(rect.width - 8, window.innerWidth - rect.left - 8),
      maxY: Math.min(rect.height - 8, window.innerHeight - rect.top - 8) });
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  hidePreview(): void { this.previewAnchor.set(null); this.hoveredId.set(null); }

  displayDate(value: string): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return match ? `${Number(match[3])}/${Number(match[2])}/${match[1]}` : value;
  }

  highlightTransform(region: MapRegion): string {
    return `translate(${region.cx} ${region.cy}) scale(1.065) translate(${-region.cx} ${-region.cy})`;
  }

  selectRegion(region: MapRegion, event: Event): void {
    if (event.type === 'click' && performance.now() < this.suppressClickUntil) return;
    this.selectedRegion.set(region);
    this.selectionTrigger = event.currentTarget as HTMLElement | SVGElement;
    this.closeSearch();
  }

  onRegionKeydown(event: KeyboardEvent, region: MapRegion): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectRegion(region, event);
    }
  }

  closeSelection(): void {
    this.selectedRegion.set(null);
    if (this.selectionTrigger?.isConnected) this.selectionTrigger.focus({ preventScroll: true });
  }

  zoomIn(): void { this.animateCamera((this.targetZoom ?? this.zoom()) * 1.5, this.center()); }
  zoomOut(): void { this.animateCamera((this.targetZoom ?? this.zoom()) / 1.5, this.center()); }

  resetView(): void {
    this.animateCamera(1, { x: 450, y: 450 });
  }

  focusRegion(region: MapRegion, event: Event): void {
    this.selectedRegion.set(region);
    this.hoveredId.set(null);
    this.focusedId.set(null);
    this.closeSearch();
    this.query.set(region.name);
    this.selectionTrigger = this.mapSvg?.nativeElement ?? event.currentTarget as HTMLElement;
    this.mapSvg?.nativeElement.focus({ preventScroll: true });
    const bounds = region.bounds ?? [region.cx - 75, region.cy - 75, region.cx + 75, region.cy + 75];
    const span = Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]);
    this.animateCamera(900 / (span * 1.55), {
      x: (bounds[0] + bounds[2]) / 2, y: (bounds[1] + bounds[3]) / 2,
    });
  }

  private constrain(zoom: number, center: { x: number; y: number }) {
    const nextZoom = Math.max(1, Math.min(8, zoom));
    // Allow a little movement even at the fit level, without losing the map.
    const margin = 900 / nextZoom / 4;
    return { zoom: nextZoom, center: {
      x: Math.max(margin, Math.min(900 - margin, center.x)),
      y: Math.max(margin, Math.min(900 - margin, center.y)),
    } };
  }

  private stopAnimation(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.targetZoom = undefined;
  }

  private animateCamera(zoom: number, center: { x: number; y: number }): void {
    this.hidePreview();
    this.stopAnimation();
    const target = this.constrain(zoom, center);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.zoom.set(target.zoom); this.center.set(target.center); return;
    }
    const startCenter = this.center(), startSize = 900 / this.zoom();
    const targetSize = 900 / target.zoom, start = performance.now();
    this.targetZoom = target.zoom;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 280);
      const eased = 1 - (1 - progress) ** 3;
      this.zoom.set(900 / (startSize + (targetSize - startSize) * eased));
      this.center.set({ x: startCenter.x + (target.center.x - startCenter.x) * eased,
        y: startCenter.y + (target.center.y - startCenter.y) * eased });
      if (progress < 1) this.frame = requestAnimationFrame(tick);
      else { this.frame = undefined; this.targetZoom = undefined; }
    };
    this.frame = requestAnimationFrame(tick);
  }

  onMapPointerDown(event: PointerEvent): void {
    this.hidePreview();
    if (event.button !== 0 || this.pointer) return;
    const svg = event.currentTarget as SVGSVGElement;
    const inverse = svg.getScreenCTM()?.inverse();
    if (!inverse) return;
    this.stopAnimation();
    this.suppressClickUntil = 0;
    this.closeSearch();
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY,
      centerX: this.center().x, centerY: this.center().y, unitX: inverse.a, unitY: inverse.d, svg };
  }

  onMapPointerMove(event: PointerEvent): void {
    const pointer = this.pointer;
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!this.dragging() && Math.hypot(dx, dy) < 5) return;
    if (!this.dragging()) {
      this.dragging.set(true);
      pointer.svg.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    this.hoveredId.set(null);
    this.center.set(this.constrain(this.zoom(), {
      x: pointer.centerX - dx * pointer.unitX, y: pointer.centerY - dy * pointer.unitY,
    }).center);
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onMapPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.pointer?.id) return;
    this.endDrag();
  }

  private endDrag(): void {
    if (this.dragging()) this.suppressClickUntil = performance.now() + 500;
    const pointer = this.pointer;
    this.pointer = undefined;
    this.dragging.set(false);
    if (pointer?.svg.hasPointerCapture(pointer.id)) pointer.svg.releasePointerCapture(pointer.id);
  }

  onMapWheel(event: WheelEvent): void {
    event.preventDefault();
    if (this.pointer) return;
    const svg = event.currentTarget as SVGSVGElement;
    const inverse = svg.getScreenCTM()?.inverse();
    if (!inverse) return;
    const anchor = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse);
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? svg.clientHeight : 1);
    const zoom = Math.max(1, Math.min(8, (this.targetZoom ?? this.zoom()) * Math.exp(-Math.max(-500, Math.min(500, delta)) * .002)));
    const ratio = this.zoom() / zoom;
    this.animateCamera(zoom, {
      x: anchor.x - (anchor.x - this.center().x) * ratio,
      y: anchor.y - (anchor.y - this.center().y) * ratio,
    });
  }

  onMapKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const step = 900 / this.zoom() * .12;
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    const offset = offsets[event.key];
    if (offset) { event.preventDefault(); this.animateCamera(this.zoom(), { x: this.center().x + offset[0], y: this.center().y + offset[1] }); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); this.zoomIn(); }
    else if (event.key === '-') { event.preventDefault(); this.zoomOut(); }
    else if (event.key === '0') { event.preventDefault(); this.resetView(); }
  }
}
