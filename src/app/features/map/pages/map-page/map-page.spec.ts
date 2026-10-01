import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MapPage, normalizeMapSearch } from './map-page';
import { previewPlacement } from '../../components/area-preview/area-preview';

const sampleMap = {
  viewBox: '0 0 900 900',
  sourceUrl: 'https://example.com/map-data',
  updatedAt: '2026-04-30',
  boundaryDate: '2026-03-13',
  regions: [
    { id: '25001', name: 'Biên Hòa', type: 'Phường', path: 'M100 100h100v100h-100z', cx: 150, cy: 150, bounds: [100, 100, 200, 200] },
    { id: '25002', name: 'Đá Bạc', type: 'Xã', path: 'M200 200h100v100h-100z', cx: 250, cy: 250, bounds: [200, 200, 300, 300] },
  ],
};

async function readyMap() {
  const fixture = TestBed.createComponent(MapPage);
  fixture.detectChanges();
  await vi.waitFor(() => expect(fixture.componentInstance.loadState()).toBe('ready'));
  fixture.detectChanges();
  return fixture;
}

describe('Đồng Nai map', () => {
  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sampleMap }));
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    await TestBed.configureTestingModule({ imports: [MapPage], providers: [provideRouter([])] }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('expands the floating menu and closes it on Escape or outside click', async () => {
    const fixture = await readyMap();
    const page = fixture.nativeElement as HTMLElement;
    const toggle = page.querySelector<HTMLButtonElement>('.menu-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.menuOpen()).toBe(true);
    expect(page.querySelector('.floating-menu a')?.getAttribute('href')).toBe('/');
    page.querySelector('.floating-menu')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });

  it('shows a cursor preview with an image and description, and dismisses on leave or touch', async () => {
    const fixture = await readyMap();
    const page = fixture.nativeElement as HTMLElement;
    const stage = page.querySelector<HTMLElement>('.map-stage')!;
    vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 500 } as DOMRect);
    const path = page.querySelector<SVGPathElement>('.region')!;
    path.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse', clientX: 250, clientY: 150 }));
    fixture.detectChanges();
    const preview = page.querySelector<HTMLElement>('app-area-preview')!;
    expect(preview.textContent).toContain('Biên Hòa');
    expect(preview.textContent).toContain('thuộc thành phố Đồng Nai');
    expect(preview.querySelector('img')?.getAttribute('src')).toContain('data:image/svg+xml');
    expect(path.getAttribute('aria-describedby')).toBe('map-area-preview');
    path.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    fixture.detectChanges();
    expect(page.querySelector('app-area-preview')).toBeNull();
    path.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch', clientX: 250, clientY: 150 }));
    fixture.detectChanges();
    expect(page.querySelector('app-area-preview')).toBeNull();
  });

  it('flips the hover preview near the cursor at the bottom-right edge', () => {
    const result = previewPlacement({ x: 590, y: 490, minX: 8, minY: 8, maxX: 592, maxY: 492 });
    expect(result.x + result.width).toBeLessThan(590);
    expect(result.y + result.height).toBeLessThan(490);
    const small = previewPlacement({ x: 30, y: 30, minX: 8, minY: 8, maxX: 180, maxY: 170 });
    expect(small.x).toBe(8);
    expect(small.y).toBe(8);
    expect(small.width).toBe(172);
    expect(small.height).toBe(162);
  });

  it('opens the search results on focus, filters accent-free names, and closes outside', async () => {
    expect(normalizeMapSearch('  ĐÁ BẠC ')).toBe('da bac');
    const fixture = await readyMap();
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector<HTMLInputElement>('input[type="search"]')!;

    expect(page.querySelector('.search-results')).toBeNull();
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.region-item')).toHaveLength(2);

    input.value = 'bien hoa';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelectorAll('.region-item')).toHaveLength(1);
    expect(page.querySelector('.region-item')?.textContent).toContain('Biên Hòa');

    input.value = 'da bac';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(page.querySelector('.region-item')?.textContent).toContain('Đá Bạc');

    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    expect(page.querySelector('.search-results')).toBeNull();
  });

  it('shows compact region details from keyboard and fits a searched region by its bounds', async () => {
    const fixture = await readyMap();
    const page = fixture.nativeElement as HTMLElement;
    const firstRegion = page.querySelector<SVGPathElement>('.region')!;

    firstRegion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(page.querySelector('.selection-details')?.textContent).toContain('Biên Hòa');
    expect(page.querySelector('.region-highlight')).not.toBeNull();
    expect(page.querySelector('dialog')).toBeNull();

    const input = page.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    page.querySelectorAll<HTMLButtonElement>('.region-item')[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedRegion()?.name).toBe('Đá Bạc');
    expect(fixture.componentInstance.showSearchResults()).toBe(false);
    expect(fixture.componentInstance.zoom()).toBeCloseTo(900 / 155);
    expect(fixture.componentInstance.center()).toEqual({ x: 250, y: 250 });
    expect(page.querySelector('.selection-details')?.textContent).toContain('Đá Bạc');

    page.querySelector<HTMLButtonElement>('.dialog-close')!.click();
    fixture.detectChanges();
    expect(page.querySelector('.selection-details')).toBeNull();
  });

  it('drags the map without selecting the region under the pointer', async () => {
    const fixture = await readyMap();
    const page = fixture.nativeElement as HTMLElement;
    const svg = page.querySelector<SVGSVGElement>('svg.regions-map')!;
    const region = page.querySelector<SVGPathElement>('.region')!;
    Object.defineProperty(svg, 'getScreenCTM', { value: () => ({ inverse: () => ({ a: 1, d: 1 }) }) });
    Object.defineProperty(svg, 'setPointerCapture', { value: vi.fn() });
    Object.defineProperty(svg, 'hasPointerCapture', { value: () => true });
    Object.defineProperty(svg, 'releasePointerCapture', { value: vi.fn() });

    const pointer = (x: number, y: number) => ({ button: 0, pointerId: 1, clientX: x, clientY: y,
      currentTarget: svg, preventDefault: vi.fn() }) as unknown as PointerEvent;
    fixture.componentInstance.onMapPointerDown(pointer(100, 100));
    fixture.componentInstance.onMapPointerMove(pointer(120, 110));
    expect(fixture.componentInstance.dragging()).toBe(true);
    expect(fixture.componentInstance.center()).toEqual({ x: 430, y: 440 });
    fixture.componentInstance.onMapPointerUp(pointer(120, 110));
    fixture.componentInstance.selectRegion(sampleMap.regions[0] as never, { type: 'click', currentTarget: region } as unknown as Event);
    expect(fixture.componentInstance.selectedRegion()).toBeNull();
  });

  it('zooms around the wheel cursor and respects the zoom limits', async () => {
    const fixture = await readyMap();
    const svg = (fixture.nativeElement as HTMLElement).querySelector<SVGSVGElement>('svg.regions-map')!;
    Object.defineProperty(svg, 'getScreenCTM', { value: () => ({ inverse: () => ({ a: 1, d: 1 }) }) });
    vi.stubGlobal('DOMPoint', class {
      constructor(public x: number, public y: number) {}
      matrixTransform() { return { x: this.x, y: this.y }; }
    });
    const wheel = (deltaY: number) => ({ currentTarget: svg, clientX: 600, clientY: 450,
      deltaY, deltaMode: 0, preventDefault: vi.fn() }) as unknown as WheelEvent;

    for (let i = 0; i < 3; i++) fixture.componentInstance.onMapWheel(wheel(-1000));
    expect(fixture.componentInstance.zoom()).toBe(8);
    expect(fixture.componentInstance.center().x).toBeCloseTo(581.25);
    for (let i = 0; i < 3; i++) fixture.componentInstance.onMapWheel(wheel(1000));
    expect(fixture.componentInstance.zoom()).toBe(1);
    expect(fixture.componentInstance.center().x).toBeCloseTo(450);
  });
});
