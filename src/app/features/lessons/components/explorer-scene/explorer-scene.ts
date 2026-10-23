import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-explorer-scene',
  imports: [RouterLink],
  templateUrl: './explorer-scene.html',
  styleUrl: './explorer-scene.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerScene {
  readonly stops = [
    { id: 'river', icon: '≈', name: 'Dòng sông', title: 'Đi theo dòng nước!', text: 'Nếu vẽ một dòng sông trên bản đồ, em sẽ chọn màu gì? Mở bản đồ và cùng tìm những đường nước nhé.', route: '/map', action: 'Mở bản đồ' },
    { id: 'forest', icon: '♧', name: 'Cây xanh', title: 'Nhìn quanh, khám phá nào!', text: 'Chọn một góc nhìn, xoay nhẹ và quan sát. Em có tìm được cây xanh trong khung cảnh không?', route: '/panorama', action: 'Khám phá góc 360°' },
    { id: 'village', icon: '⌂', name: 'Ngôi nhà', title: 'Mỗi nơi có một câu chuyện', text: 'Một ngôi nhà ngày xưa có gì khác hôm nay? Cùng mở bài học và tập quan sát những điều thay đổi nhé.', route: '/lessons', action: 'Chọn bài học' },
  ] as const;
  readonly selectedId = signal<string | null>(null);
  readonly visited = signal<readonly string[]>([]);
  readonly selected = computed(() => this.stops.find(stop => stop.id === this.selectedId()));
  discover(id: string): void {
    if (!this.stops.some(stop => stop.id === id)) return;
    this.selectedId.set(id);
    this.visited.update(ids => ids.includes(id) ? ids : [...ids, id]);
  }
}
