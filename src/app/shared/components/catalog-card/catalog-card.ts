import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'a[appCatalogCard], button[appCatalogCard]',
  template: '<ng-content />',
  styleUrl: './catalog-card.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogCard {}
