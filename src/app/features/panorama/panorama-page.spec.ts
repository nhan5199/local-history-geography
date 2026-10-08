import { TestBed } from '@angular/core/testing';
import { MediaLibraryService, type MediaAsset } from '../../core/firebase/media-library.service';
import { PanoramaPage } from './panorama-page';

vi.mock('pannellum', () => ({}));

const demo: MediaAsset = {
  id: 'demo-panorama', kind: 'panorama', title: 'Ảnh mẫu 360°', description: 'Ảnh mẫu', url: '/demo/alma.jpg',
};

function setupViewer() {
  const callbacks = new Map<string, (...args: unknown[]) => void>();
  const viewer = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      callbacks.set(event, callback);
      return viewer;
    }),
    destroy: vi.fn(), resize: vi.fn(), stopMovement: vi.fn(),
    getYaw: vi.fn(() => 0), getPitch: vi.fn(() => 0), getHfov: vi.fn(() => 100),
    setYaw: vi.fn(), setPitch: vi.fn(), setHfov: vi.fn(), lookAt: vi.fn(),
  };
  const factory = vi.fn((_element: HTMLElement, _options: Record<string, unknown>) => viewer);
  Object.defineProperty(window, 'pannellum', { configurable: true, value: { viewer: factory } });
  return { viewer, factory, callbacks };
}

describe('PanoramaPage', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'pannellum');
    Reflect.deleteProperty(document, 'fullscreenEnabled');
  });

  it('opens the equirectangular image and supports controls and retry', async () => {
    const { viewer, factory, callbacks } = setupViewer();
    const library = { list: vi.fn(async () => [demo]), resolveUrl: vi.fn(async () => '/demo/alma.jpg') };
    await TestBed.configureTestingModule({
      imports: [PanoramaPage],
      providers: [{ provide: MediaLibraryService, useValue: library }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PanoramaPage);
    fixture.detectChanges();
    await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    expect(factory.mock.calls[0][1]).toMatchObject({ type: 'equirectangular', panorama: '/demo/alma.jpg', draggable: true });

    callbacks.get('load')?.();
    fixture.detectChanges();
    expect(fixture.componentInstance.loadState()).toBe('ready');
    const host = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.viewer-host')!;
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(viewer.setYaw).toHaveBeenCalledWith(12, expect.anything());
    fixture.componentInstance.zoomIn();
    expect(viewer.setHfov).toHaveBeenCalledWith(80, expect.anything());
    fixture.componentInstance.resetView();
    expect(viewer.lookAt).toHaveBeenCalledWith(0, 0, 100, expect.anything());

    callbacks.get('error')?.('image error');
    fixture.detectChanges();
    expect(fixture.componentInstance.loadState()).toBe('error');
    expect(viewer.destroy).toHaveBeenCalledTimes(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thử lại');
    fixture.componentInstance.retry();
    await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(2));
    fixture.destroy();
  });

  it('ignores a late image URL after navigation away', async () => {
    const { factory } = setupViewer();
    let resolveUrl!: (url: string) => void;
    const library = {
      list: vi.fn(async () => [demo]),
      resolveUrl: vi.fn(() => new Promise<string>(resolve => { resolveUrl = resolve; })),
    };
    await TestBed.configureTestingModule({
      imports: [PanoramaPage],
      providers: [{ provide: MediaLibraryService, useValue: library }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PanoramaPage);
    fixture.detectChanges();
    await vi.waitFor(() => expect(library.resolveUrl).toHaveBeenCalledTimes(1));
    fixture.destroy();
    resolveUrl('/demo/alma.jpg');
    await Promise.resolve();
    await Promise.resolve();
    expect(factory).not.toHaveBeenCalled();
  });

  it('reports a rejected fullscreen request and clears the notice on retry', async () => {
    const { factory, callbacks } = setupViewer();
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    const library = { list: vi.fn(async () => [demo]), resolveUrl: vi.fn(async () => '/demo/alma.jpg') };
    await TestBed.configureTestingModule({
      imports: [PanoramaPage],
      providers: [{ provide: MediaLibraryService, useValue: library }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PanoramaPage);
    fixture.detectChanges();
    await vi.waitFor(() => expect(factory).toHaveBeenCalledTimes(1));
    callbacks.get('load')?.();
    fixture.detectChanges();

    const frame = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.viewer-frame')!;
    frame.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
    await fixture.componentInstance.toggleFullscreen();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.viewer-notice')?.textContent)
      .toContain('Trình duyệt chưa hỗ trợ');
    expect(fixture.componentInstance.loadState()).toBe('ready');

    frame.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    await fixture.componentInstance.toggleFullscreen();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.viewer-notice')).toBeNull();
    fixture.destroy();
  });
});
