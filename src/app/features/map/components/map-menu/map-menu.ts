import { Component, ElementRef, HostListener, ViewChild, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-map-menu',
  imports: [RouterLink],
  templateUrl: './map-menu.html',
  styleUrl: './map-menu.scss',
})
export class MapMenu {
  @ViewChild('toggleButton') private toggleButton?: ElementRef<HTMLButtonElement>;
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly expanded = signal(false);
  readonly expandedChange = output<boolean>();
  readonly action = output<'reset' | 'search' | 'map'>();

  toggle(): void {
    this.expanded.update(value => !value);
    this.expandedChange.emit(this.expanded());
  }

  close(restoreFocus = false): void {
    this.expanded.set(false);
    this.expandedChange.emit(false);
    if (restoreFocus) this.toggleButton?.nativeElement.focus();
  }

  choose(action: 'reset' | 'search' | 'map'): void {
    this.close(action !== 'search');
    this.action.emit(action);
  }

  onEscape(event: Event): void {
    if (!this.expanded()) return;
    event.stopPropagation();
    this.close(true);
  }

  @HostListener('document:pointerdown', ['$event'])
  outside(event: PointerEvent): void {
    if (this.expanded() && event.target instanceof Node && !this.host.nativeElement.contains(event.target)) this.close();
  }
}
