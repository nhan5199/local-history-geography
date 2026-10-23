declare module 'page-flip' {
  export interface FlipEvent<T> { data: T }
  export class PageFlip {
    constructor(element: HTMLElement, settings: {
      width: number; height: number; size: 'stretch'; minWidth: number; maxWidth: number;
      minHeight: number; maxHeight: number; showCover: boolean; usePortrait: boolean;
      flippingTime: number; mobileScrollSupport: boolean;
    });
    loadFromHTML(pages: HTMLElement[]): void;
    on(name: 'flip', callback: (event: FlipEvent<number>) => void): this;
    on(name: 'changeState', callback: (event: FlipEvent<'user_fold' | 'fold_corner' | 'flipping' | 'read'>) => void): this;
    on(name: 'changeOrientation', callback: (event: FlipEvent<'portrait' | 'landscape'>) => void): this;
    getCurrentPageIndex(): number;
    getOrientation(): 'portrait' | 'landscape';
    getState(): 'user_fold' | 'fold_corner' | 'flipping' | 'read';
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    destroy(): void;
  }
}
