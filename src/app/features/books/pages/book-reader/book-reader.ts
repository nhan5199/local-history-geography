import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, ViewChild, inject, signal, AfterViewInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GlobalWorkerOptions, getDocument, type PDFDocumentLoadingTask, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import { PageFlip } from 'page-flip';
import { MediaLibraryService, type MediaAsset } from '../../../../core/firebase/media-library.service';
import { readPdfBytes } from '../../read-pdf-bytes';

// The copy in public/demo is version-matched to the pinned pdfjs-dist package.
GlobalWorkerOptions.workerSrc = '/demo/pdf.worker.min.mjs';

interface RenderedPage { canvas?: HTMLCanvasElement; image?: HTMLImageElement; url?: string; task?: RenderTask }
interface BookSession {
  pdf: PDFDocumentProxy;
  pages: HTMLElement[];
  cache: Map<number, RenderedPage>;
  desired: Set<number>;
  queue: number[];
  pending: Set<number>;
  ready: Set<number>;
  failed: Set<number>;
  waiters: Map<number, Set<(settled: boolean) => void>>;
  retiredUrls: Set<string>;
  active: number;
}

@Component({
  selector: 'app-book-reader',
  imports: [RouterLink],
  templateUrl: './book-reader.html',
  styleUrl: './book-reader.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BookReader implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly library = inject(MediaLibraryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);
  @ViewChild('stage') private stage?: ElementRef<HTMLElement>;

  readonly asset = signal<MediaAsset | null>(null);
  readonly pdfUrl = signal('');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly missing = signal(false);
  readonly currentPage = signal(1);
  readonly pageCount = signal(0);
  readonly readerReady = signal(false);
  readonly touchReady = signal(false);
  readonly navigationBusy = signal(false);

  private flip: PageFlip | null = null;
  private session: BookSession | null = null;
  private loadTask: PDFDocumentLoadingTask | null = null;
  private abort: AbortController | null = null;
  private epoch = 0;
  private touchEpoch = 0;
  private turnUnlockTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() { this.destroyRef.onDestroy(() => this.cleanup()); }

  ngAfterViewInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      void this.open(params.get('id'));
    });
  }

  async retry(): Promise<void> { await this.open(this.route.snapshot.paramMap.get('id')); }

  private async open(id: string | null): Promise<void> {
    this.cleanup();
    const epoch = this.epoch;
    this.loading.set(true);
    this.error.set('');
    this.missing.set(false);
    this.asset.set(null);
    this.pageCount.set(0);
    this.currentPage.set(1);
    this.readerReady.set(false);
    this.touchReady.set(false);
    this.navigationBusy.set(false);
    try {
      const book = (await this.library.list('book')).find(item => item.id === id);
      if (epoch !== this.epoch) return;
      if (!book) { this.missing.set(true); return; }
      this.asset.set(book);
      const url = await this.library.resolveUrl(book);
      if (epoch !== this.epoch) return;
      this.pdfUrl.set(url);
      this.abort = new AbortController();
      const bytes = await readPdfBytes(url, this.abort.signal);
      if (epoch !== this.epoch) return;
      this.loadTask = getDocument({ data: bytes });
      const pdf = await this.loadTask.promise;
      if (epoch !== this.epoch) return;
      if (pdf.numPages > 500) throw new Error('Tài liệu có quá nhiều trang (tối đa 500).');
      const firstPage = await pdf.getPage(1);
      if (epoch !== this.epoch) return;
      const viewport = firstPage.getViewport({ scale: 1 });
      this.pageCount.set(pdf.numPages);
      // PageFlip measures its parent at construction, so reveal the workspace first.
      this.loading.set(false);
      this.changeDetector.detectChanges();
      const session = this.createBook(pdf, viewport.width / viewport.height);
      const firstSpread = [0, ...this.spreadPages(1, pdf.numPages, this.flip!.getOrientation())];
      const settled = await this.waitForPages(session, firstSpread);
      if (epoch !== this.epoch || !settled) return;
      this.readerReady.set(true);
      this.updateTouchReadiness(session);
    } catch (cause) {
      if (epoch !== this.epoch) return;
      const message = cause instanceof Error ? cause.message : 'Không mở được sách.';
      this.cleanup();
      this.error.set(message);
      this.loading.set(false);
    } finally {
      if (epoch === this.epoch) this.loading.set(false);
    }
  }

  private createBook(pdf: PDFDocumentProxy, ratio: number): BookSession {
    // The stage lives inside @else; a route change from a missing book recreates it.
    this.changeDetector.detectChanges();
    const stage = this.stage?.nativeElement;
    if (!stage) throw new Error('Không tạo được vùng đọc sách.');
    const pages = Array.from({ length: pdf.numPages }, (_, index) => {
      const page = document.createElement('div');
      page.className = 'book-paper';
      page.dataset['page'] = String(index + 1);
      const placeholder = document.createElement('span');
      placeholder.className = 'book-paper-placeholder';
      placeholder.textContent = `Trang ${index + 1}`;
      page.append(placeholder);
      return page;
    });
    const mount = document.createElement('div');
    mount.className = 'book-mount';
    stage.append(mount);
    const width = Math.max(240, Math.min(570, Math.round(600 * ratio)));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const session: BookSession = { pdf, pages, cache: new Map(), desired: new Set(), queue: [], pending: new Set(),
      ready: new Set(), failed: new Set(), waiters: new Map(), retiredUrls: new Set(), active: 0 };
    this.session = session;
    this.flip = new PageFlip(mount, {
      width, height: 600, size: 'stretch', minWidth: Math.max(180, Math.round(width * .52)),
      maxWidth: width, minHeight: 310, maxHeight: 600, showCover: true,
      usePortrait: true, flippingTime: reduced ? 1 : 650, mobileScrollSupport: false,
    });
    this.flip.on('flip', event => {
      this.currentPage.set(event.data + 1);
      this.clearTurnTimer();
      this.navigationBusy.set(false);
      if (this.session === session) {
        this.renderNearby(session, event.data);
        this.updateTouchReadiness(session);
      }
    });
    this.flip.on('changeState', event => {
      if (event.data === 'read') {
        this.releaseRetiredUrls(session);
        // A dragged corner may return without a flip event.
        if (this.session === session && !this.navigationBusy()) {
          this.renderNearby(session, this.flip!.getCurrentPageIndex());
          this.updateTouchReadiness(session);
        }
      }
    });
    this.flip.on('changeOrientation', () => {
      if (this.session === session) {
        this.renderNearby(session, this.flip!.getCurrentPageIndex());
        this.updateTouchReadiness(session);
      }
    });
    this.flip.loadFromHTML(pages);
    this.renderNearby(session, 0);
    return session;
  }

  private renderNearby(session: BookSession, center: number): void {
    const desired = new Set<number>();
    // Six nearby pages leave room for the two renders that may still be finishing.
    for (let index = Math.max(0, center - 2); index <= Math.min(session.pages.length - 1, center + 3); index++) {
      desired.add(index);
    }
    this.reconcile(session, desired, [center]);
  }

  private reconcile(session: BookSession, desired: Set<number>, priority: number[]): void {
    for (const index of session.desired) {
      if (!desired.has(index)) this.wakeWaiters(session, index, false);
    }
    session.desired = desired;
    for (const [index, rendered] of session.cache) {
      if (desired.has(index) || session.pending.has(index)) continue;
      this.disposePage(session, rendered);
      session.cache.delete(index);
      session.ready.delete(index);
    }
    const ordered = [...priority, ...desired].filter((index, position, all) => desired.has(index) && all.indexOf(index) === position);
    session.queue = ordered.filter(index => !session.cache.has(index) && !session.pending.has(index) && !session.failed.has(index));
    this.pump(session);
  }

  private promote(session: BookSession, indexes: number[]): void {
    session.queue = [...indexes, ...session.queue].filter((index, position, all) =>
      session.desired.has(index) && !session.cache.has(index) && !session.pending.has(index) &&
      !session.failed.has(index) && all.indexOf(index) === position);
    this.pump(session);
  }

  private pump(session: BookSession): void {
    while (session === this.session && session.active < 2 && session.queue.length) {
      const index = session.queue.shift()!;
      if (!session.desired.has(index) || session.cache.has(index) || session.pending.has(index) || session.failed.has(index)) continue;
      session.pending.add(index);
      session.active++;
      void this.renderPage(session, index).finally(() => {
        session.pending.delete(index);
        session.active--;
        this.pump(session);
      });
    }
  }

  private async renderPage(session: BookSession, index: number): Promise<void> {
    let rendered: RenderedPage | undefined;
    let ready = false;
    try {
      const page = await session.pdf.getPage(index + 1);
      if (session !== this.session || !session.desired.has(index)) return;
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(900 / base.width, 1350 / base.height, Math.sqrt(2_000_000 / (base.width * base.height)));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      rendered = { canvas };
      session.cache.set(index, rendered);
      rendered.task = page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport });
      await rendered.task.promise;
      if (session !== this.session || !session.desired.has(index)) return;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(value => value ? resolve(value) : reject(new Error('Không tạo được ảnh trang.')), 'image/png'));
      rendered.url = URL.createObjectURL(blob);
      const image = new Image();
      image.alt = `Trang ${index + 1}`;
      image.src = rendered.url;
      await image.decode();
      if (session !== this.session || !session.desired.has(index)) return;
      rendered.image = image;
      session.pages[index].append(image);
      canvas.width = 0;
      canvas.height = 0;
      rendered.canvas = undefined;
      rendered.task = undefined;
      session.ready.add(index);
      this.wakeWaiters(session, index, true);
      ready = true;
    } catch {
      if (session === this.session && session.desired.has(index)) {
        const placeholder = session.pages[index].querySelector('.book-paper-placeholder');
        if (placeholder) placeholder.textContent = `Không hiển thị được trang ${index + 1}`;
        session.failed.add(index);
        this.wakeWaiters(session, index, true);
      }
    } finally {
      if (rendered && !ready) {
        this.disposePage(session, rendered);
        if (session.cache.get(index) === rendered) session.cache.delete(index);
      }
    }
  }

  private disposePage(session: BookSession, rendered: RenderedPage): void {
    rendered.task?.cancel();
    if (rendered.canvas) { rendered.canvas.width = 0; rendered.canvas.height = 0; }
    rendered.image?.remove();
    if (rendered.url) {
      if (session === this.session && this.flip?.getState() !== 'read') session.retiredUrls.add(rendered.url);
      else URL.revokeObjectURL(rendered.url);
      rendered.url = undefined;
    }
  }

  private releaseRetiredUrls(session: BookSession): void {
    for (const url of session.retiredUrls) URL.revokeObjectURL(url);
    session.retiredUrls.clear();
  }

  private wakeWaiters(session: BookSession, index: number, settled: boolean): void {
    for (const resolve of session.waiters.get(index) ?? []) resolve(settled);
    session.waiters.delete(index);
  }

  private waitForPages(session: BookSession, indexes: number[]): Promise<boolean> {
    return Promise.all(indexes.map(index => {
      if (session !== this.session) return Promise.resolve(false);
      if (session.ready.has(index) || session.failed.has(index)) return Promise.resolve(true);
      return new Promise<boolean>(resolve => {
        const waiters = session.waiters.get(index) ?? new Set<(settled: boolean) => void>();
        waiters.add(resolve);
        session.waiters.set(index, waiters);
      });
    })).then(results => results.every(Boolean));
  }

  private spreadPages(index: number, count: number, orientation: 'portrait' | 'landscape'): number[] {
    if (index < 0 || index >= count) return [];
    if (orientation === 'portrait' || index === 0) return [index];
    const first = index % 2 === 0 ? index - 1 : index;
    return [first, first + 1].filter(page => page < count);
  }

  private destination(index: number, direction: -1 | 1): number {
    if (!this.flip) return -1;
    if (this.flip.getOrientation() === 'portrait') return index + direction;
    return direction > 0 ? (index === 0 ? 1 : index + 2) : (index <= 1 ? 0 : index - 2);
  }

  private updateTouchReadiness(session: BookSession): void {
    if (session !== this.session || !this.flip) return;
    const token = ++this.touchEpoch;
    const current = this.flip.getCurrentPageIndex();
    const orientation = this.flip.getOrientation();
    const adjacent = [-1, 1].flatMap(direction =>
      this.spreadPages(this.destination(current, direction as -1 | 1), session.pages.length, orientation));
    this.touchReady.set(false);
    this.promote(session, adjacent);
    void this.waitForPages(session, adjacent).then(settled => {
      if (token === this.touchEpoch && session === this.session) this.touchReady.set(settled);
    });
  }

  previous(): void { this.turn(-1); }
  next(): void { this.turn(1); }

  private async turn(direction: -1 | 1): Promise<void> {
    if (!this.flip || !this.session || !this.readerReady() || this.navigationBusy() || this.flip.getState() !== 'read') return;
    const flip = this.flip;
    const session = this.session;
    const current = flip.getCurrentPageIndex();
    const destination = this.destination(current, direction);
    const target = this.spreadPages(destination, session.pages.length, flip.getOrientation());
    if (!target.length) return;
    this.navigationBusy.set(true);
    this.touchReady.set(false);
    const visible = this.spreadPages(current, session.pages.length, flip.getOrientation());
    this.reconcile(session, new Set([...visible, ...target]), target);
    const settled = await this.waitForPages(session, target);
    if (!settled || session !== this.session || flip !== this.flip || flip.getState() !== 'read') {
      if (session === this.session) this.navigationBusy.set(false);
      return;
    }
    // Install the fallback before turning: reduced-motion turns emit flip synchronously.
    this.clearTurnTimer();
    this.turnUnlockTimer = setTimeout(() => {
      if (session === this.session) {
        this.navigationBusy.set(false);
        this.renderNearby(session, flip.getCurrentPageIndex());
        this.updateTouchReadiness(session);
      }
    }, 800);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (direction > 0) flip.turnToNextPage(); else flip.turnToPrevPage();
    } else {
      if (direction > 0) flip.flipNext('bottom'); else flip.flipPrev('bottom');
    }
  }

  async goToPage(value: string): Promise<void> {
    const page = Number(value);
    if (!this.flip || !this.session || !this.readerReady() || this.navigationBusy() || this.flip.getState() !== 'read' ||
      !Number.isInteger(page) || page < 1 || page > this.pageCount()) return;
    const flip = this.flip;
    const session = this.session;
    const target = this.spreadPages(page - 1, session.pages.length, flip.getOrientation());
    const visible = this.spreadPages(flip.getCurrentPageIndex(), session.pages.length, flip.getOrientation());
    this.navigationBusy.set(true);
    this.touchReady.set(false);
    this.reconcile(session, new Set([...visible, ...target]), target);
    const settled = await this.waitForPages(session, target);
    if (settled && session === this.session && flip === this.flip && flip.getState() === 'read') {
      flip.turnToPage(page - 1);
      this.currentPage.set(flip.getCurrentPageIndex() + 1);
      this.renderNearby(session, flip.getCurrentPageIndex());
      this.updateTouchReadiness(session);
    }
    if (session === this.session) this.navigationBusy.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || !this.flip || this.navigationBusy() || this.flip.getState() !== 'read') return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); this.next(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); this.previous(); }
  }

  private cleanup(): void {
    this.epoch++;
    this.touchEpoch++;
    this.clearTurnTimer();
    this.readerReady.set(false);
    this.touchReady.set(false);
    this.navigationBusy.set(false);
    this.pdfUrl.set('');
    this.abort?.abort();
    this.abort = null;
    if (this.session) {
      for (const rendered of this.session.cache.values()) this.disposePage(this.session, rendered);
      for (const waiters of this.session.waiters.values()) for (const resolve of waiters) resolve(false);
      this.session.waiters.clear();
      this.releaseRetiredUrls(this.session);
      this.session.cache.clear();
      this.session.queue = [];
      this.session.pending.clear();
      this.session = null;
    }
    this.flip?.destroy();
    this.flip = null;
    this.stage?.nativeElement.replaceChildren();
    if (this.loadTask) void this.loadTask.destroy().catch(() => undefined);
    this.loadTask = null;
  }

  private clearTurnTimer(): void {
    if (this.turnUnlockTimer !== null) clearTimeout(this.turnUnlockTimer);
    this.turnUnlockTimer = null;
  }
}
