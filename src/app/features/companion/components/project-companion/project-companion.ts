import { afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, inject, Injector, OnDestroy, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { COMPANION_CONFIG } from '../../config/companion.config';
import { LessonGuide } from '../../data-access/lesson-guide';
import type { GuideMessage } from '../../models/guide-message';
import { GuideVoice } from '../../voice/guide-voice';

@Component({
  selector: 'app-project-companion',
  imports: [RouterLink],
  templateUrl: './project-companion.html',
  styleUrl: './project-companion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCompanion implements OnDestroy {
  readonly character = COMPANION_CONFIG;
  readonly voice = inject(GuideVoice);
  private readonly guide = inject(LessonGuide);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects),
  ), { initialValue: this.router.url });
  private readonly injector = inject(Injector);
  readonly open = signal(false);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly imageFailed = signal(false);
  readonly announcement = signal('');
  readonly messages = signal<GuideMessage[]>([this.welcome()]);
  readonly prompts = computed(() => this.currentUrl().startsWith('/lessons/')
    ? ['Bài này nói gì?', 'Cho em ví dụ', 'Nước mưa chảy đi đâu?']
    : this.currentUrl().startsWith('/map') ? ['Mở bản đồ', 'Chú giải bản đồ là gì?', 'Mở góc 360°']
    : ['Chú giải bản đồ là gì?', 'Nước mưa chảy đi đâu?', 'Mở trò chơi']);
  readonly suggestions = computed(() => this.messages().at(-1)?.suggestions ?? this.prompts());
  private readonly questionInput = viewChild<ElementRef<HTMLInputElement>>('questionInput');
  private readonly messageList = viewChild<ElementRef<HTMLOListElement>>('messageList');
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');
  private nextId = 1;
  private requestVersion = 0;
  private previousSourceKey?: string;

  constructor() {
    effect(() => {
      this.currentUrl();
      this.requestVersion++;
      this.previousSourceKey = undefined;
      this.busy.set(false);
      this.voice.stop();
    });
  }

  private welcome(): GuideMessage {
    return { id: 0, role: 'guide', sources: [], text: 'Chào em! Muốn tìm hiểu điều gì? Milo sẽ tìm trong bài học và nội dung của trang.' };
  }

  togglePanel(): void {
    if (this.open()) { this.closePanel(); return; }
    this.open.set(true);
    afterNextRender(() => this.questionInput()?.nativeElement.focus(), { injector: this.injector });
  }

  closePanel(restoreFocus = true): void {
    this.requestVersion++;
    this.busy.set(false);
    this.open.set(false);
    this.voice.stop();
    if (restoreFocus) afterNextRender(() => this.launcher()?.nativeElement.focus(), { injector: this.injector });
  }

  setDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  submit(event: Event): void {
    event.preventDefault();
    void this.ask(this.draft());
  }

  async ask(value: string): Promise<void> {
    const question = value.trim().slice(0, 400);
    if (!question || this.busy()) return;
    this.voice.stop();
    this.draft.set('');
    this.busy.set(true);
    this.announcement.set('Milo đang tìm trong nội dung…');
    this.messages.update(messages => [...messages.slice(-19), { id: this.nextId++, role: 'user', text: question, sources: [] }]);
    this.scrollToLatest();
    const request = ++this.requestVersion;
    try {
      const answer = await this.guide.answer(question, { url: this.currentUrl(), previousSourceKey: this.previousSourceKey });
      if (request !== this.requestVersion) return;
      this.previousSourceKey = answer.sources[0]?.key;
      this.messages.update(messages => [...messages.slice(-19), { id: this.nextId++, role: 'guide', ...answer }]);
      this.announcement.set(answer.text);
    } catch {
      if (request !== this.requestVersion) return;
      const text = 'Milo chưa mở được nội dung. Em thử hỏi lại nhé.';
      this.messages.update(messages => [...messages.slice(-19), { id: this.nextId++, role: 'guide', text, sources: [] }]);
      this.announcement.set(text);
    } finally {
      if (request === this.requestVersion) {
        this.busy.set(false);
        this.scrollToLatest();
      }
    }
  }

  read(message: GuideMessage): void {
    if (this.voice.speakingId() === message.id) this.voice.stop();
    else this.voice.speak(message.text, message.id);
  }

  clearConversation(): void {
    this.previousSourceKey = undefined;
    this.requestVersion++;
    this.busy.set(false);
    this.voice.stop();
    this.messages.set([this.welcome()]);
    this.voice.error.set(null);
    this.announcement.set('Đã bắt đầu cuộc trò chuyện mới.');
    this.draft.set('');
    afterNextRender(() => this.questionInput()?.nativeElement.focus(), { injector: this.injector });
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.open()) return;
    event.preventDefault();
    event.stopPropagation();
    this.closePanel();
  }

  private scrollToLatest(): void {
    afterNextRender(() => {
      const element = this.messageList()?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.requestVersion++;
    this.voice.stop();
  }
}
