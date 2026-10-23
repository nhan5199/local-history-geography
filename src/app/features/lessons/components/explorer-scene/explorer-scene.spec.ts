import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ExplorerScene } from './explorer-scene';

describe('ExplorerScene', () => {
  it('reveals prompts, counts unique discoveries, and links to the chosen activity', async () => {
    await TestBed.configureTestingModule({ imports: [ExplorerScene], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(ExplorerScene);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('.discovery-progress')?.textContent).toContain('0/3');
    const pins = [...page.querySelectorAll<HTMLButtonElement>('.discovery-pin')];
    for (const [index, route] of ['/map', '/panorama', '/lessons'].entries()) {
      pins[index].click();
      pins[index].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.visited()).toHaveLength(index + 1);
      expect(page.querySelector('.discovery-link')?.getAttribute('href')).toBe(route);
      expect(page.querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
      expect(page.querySelector('.discovery-status strong')?.textContent).toBe(fixture.componentInstance.stops[index].title);
    }
    expect(page.querySelector('.discovery-progress')?.textContent).toContain('cả 3');
    fixture.componentInstance.discover('unknown');
    expect(fixture.componentInstance.visited()).toHaveLength(3);
  });
});
