import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ProjectCompanion } from '../../features/companion/components/project-companion/project-companion';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ProjectCompanion],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(event => event.urlAfterRedirects),
  ), { initialValue: this.router.url });
  // The lesson helper must not cover page corners or immersive viewer controls.
  readonly showCompanion = computed(() => !/^\/(panorama|games|teacher|questions|books\/[^/?#]+)(?:[/?#]|$)/.test(this.currentUrl()));
}
