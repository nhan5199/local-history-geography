import { Component, ElementRef, HostListener, ViewChild, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { MediaLibraryService, type MediaAsset } from '../../core/firebase/media-library.service';

interface PanoramaViewer {
  on(event: 'load', callback: () => void): PanoramaViewer;
  on(event: 'error', callback: (message: string) => void): PanoramaViewer;
  destroy(): void;
  resize(): void;
  getYaw(): number;
  getPitch(): number;
  getHfov(): number;
  setYaw(value: number, animated?: number | false): PanoramaViewer;
  setPitch(value: number, animated?: number | false): PanoramaViewer;
  setHfov(value: number, animated?: number | false): PanoramaViewer;
  lookAt(pitch: number, yaw: number, hfov: number, animated?: number | false): PanoramaViewer;
  stopMovement(): void;
}

type ViewerFactory = (element: HTMLElement, options: Record<string, unknown>) => PanoramaViewer;

@Component({
  selector: 'app-panorama-page',
  templateUrl: './panorama-page.html',
  styleUrl: './panorama-page.scss',
})
export class PanoramaPage implements AfterViewInit, OnDestroy {
  @ViewChild('viewerHost', { static: true }) private viewerHost!: ElementRef<HTMLDivElement>;
  @ViewChild('viewerFrame', { static: true }) private viewerFrame!: ElementRef<HTMLDivElement>;

  private readonly library = inject(MediaLibraryService);
  private viewer?: PanoramaViewer;
  private generation = 0;
  private destroyed = false;

  readonly assets = signal<MediaAsset[]>([]);
  readonly selected = signal<MediaAsset | null>(null);
  readonly loadState = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  readonly errorMessage = signal('');
  readonly fullscreen = signal(false);
  readonly fullscreenAvailable = typeof document !== 'undefined' && document.fullscreenEnabled;

  ngAfterViewInit(): void {
    void this.loadGallery();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.generation++;
    this.destroyViewer();
    if (document.fullscreenElement === this.viewerFrame.nativeElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }

  async loadGallery(): Promise<void> {
    const generation = ++this.generation;
    this.loadState.set('loading');
    this.errorMessage.set('');
    this.destroyViewer();
    try {
      const assets = await this.library.list('panorama');
      if (this.destroyed || generation !== this.generation) return;
      this.assets.set(assets);
      if (assets.length === 0) {
        this.selected.set(null);
        this.loadState.set('empty');
        return;
      }
      await this.selectAsset(assets[0]);
    } catch (error) {
      if (this.destroyed || generation !== this.generation) return;
      this.showError(error, 'Chưa tải được danh sách ảnh 360°. Vui lòng thử lại.');
    }
  }

  async selectAsset(asset: MediaAsset): Promise<void> {
    const generation = ++this.generation;
    this.selected.set(asset);
    this.loadState.set('loading');
    this.errorMessage.set('');
    this.destroyViewer();
    try {
      const url = await this.library.resolveUrl(asset);
      if (this.destroyed || generation !== this.generation) return;
      if (!url) throw new Error('This panorama has no image URL.');

      await import('pannellum');
      if (this.destroyed || generation !== this.generation) return;
      const factory = (window as Window & { pannellum?: { viewer?: ViewerFactory } }).pannellum?.viewer;
      if (!factory) throw new Error('The panorama viewer is unavailable.');

      const viewer = factory(this.viewerHost.nativeElement, {
        type: 'equirectangular',
        panorama: url,
        autoLoad: true,
        showControls: false,
        showFullscreenCtrl: false,
        showZoomCtrl: false,
        draggable: true,
        mouseZoom: true,
        keyboardZoom: false,
        disableKeyboardCtrl: true,
        autoRotate: 0,
        friction: this.reducedMotion() ? 1 : 0.2,
        hfov: 100,
        minHfov: 40,
        maxHfov: 120,
        pitch: 0,
        yaw: 0,
      });
      this.viewer = viewer;
      viewer.on('load', () => {
        if (this.destroyed || generation !== this.generation) return;
        this.loadState.set('ready');
        viewer.resize();
      });
      viewer.on('error', (message: string) => {
        if (this.destroyed || generation !== this.generation) return;
        this.showError(new Error(message), 'Chưa mở được ảnh 360° này. Vui lòng thử lại.');
      });
    } catch (error) {
      if (this.destroyed || generation !== this.generation) return;
      this.showError(error, 'Chưa mở được ảnh 360° này. Vui lòng thử lại.');
    }
  }

  retry(): void {
    const asset = this.selected();
    if (asset) void this.selectAsset(asset);
    else void this.loadGallery();
  }

  zoomIn(): void { this.zoomTo(this.viewer ? this.viewer.getHfov() * 0.8 : 100); }
  zoomOut(): void { this.zoomTo(this.viewer ? this.viewer.getHfov() / 0.8 : 100); }

  resetView(): void {
    if (!this.viewer || this.loadState() !== 'ready') return;
    this.viewer.stopMovement();
    this.viewer.lookAt(0, 0, 100, this.motionDuration());
  }

  async toggleFullscreen(): Promise<void> {
    this.errorMessage.set('');
    if (!this.fullscreenAvailable) return;
    try {
      if (document.fullscreenElement === this.viewerFrame.nativeElement) await document.exitFullscreen();
      else await this.viewerFrame.nativeElement.requestFullscreen();
    } catch {
      this.errorMessage.set('Trình duyệt chưa hỗ trợ chế độ toàn màn hình.');
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.fullscreen.set(document.fullscreenElement === this.viewerFrame.nativeElement);
    requestAnimationFrame(() => this.viewer?.resize());
  }

  onKeydown(event: KeyboardEvent): void {
    const viewer = this.viewer;
    if (!viewer || this.loadState() !== 'ready' || event.altKey || event.ctrlKey || event.metaKey) return;
    const duration = this.motionDuration();
    switch (event.key) {
      case 'ArrowLeft': viewer.stopMovement(); viewer.setYaw(viewer.getYaw() - 12, duration); break;
      case 'ArrowRight': viewer.stopMovement(); viewer.setYaw(viewer.getYaw() + 12, duration); break;
      case 'ArrowUp': viewer.stopMovement(); viewer.setPitch(viewer.getPitch() + 10, duration); break;
      case 'ArrowDown': viewer.stopMovement(); viewer.setPitch(viewer.getPitch() - 10, duration); break;
      case '+': case '=': this.zoomIn(); break;
      case '-': case '_': this.zoomOut(); break;
      case '0': this.resetView(); break;
      default: return;
    }
    event.preventDefault();
  }

  private zoomTo(hfov: number): void {
    if (!this.viewer || this.loadState() !== 'ready') return;
    this.viewer.stopMovement();
    this.viewer.setHfov(Math.max(40, Math.min(120, hfov)), this.motionDuration());
  }

  private reducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  private motionDuration(): number | false {
    return this.reducedMotion() ? false : 220;
  }

  private showError(error: unknown, fallback: string): void {
    console.error(fallback, error);
    this.errorMessage.set(fallback);
    this.loadState.set('error');
    this.destroyViewer();
  }

  private destroyViewer(): void {
    this.viewer?.destroy();
    this.viewer = undefined;
    this.viewerHost?.nativeElement.replaceChildren();
  }
}
