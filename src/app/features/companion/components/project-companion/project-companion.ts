import { afterNextRender, Component, ElementRef, HostListener, inject, Injector, OnDestroy, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { COMPANION_CONFIG } from '../../companion.config';
import { LessonGuide } from '../../data-access/lesson-guide';
import type { GuideMessage } from '../../models/guide-message';
import { GuideVoice } from '../../voice/guide-voice';

type Corner = 'left' | 'right';
const PREFERENCES_KEY = 'ourplace.companion.preferences.v1';

function readPreferences(): { hidden: boolean; side: Corner } {
  try {
    const value = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}');
    return {
      hidden: value?.hidden === true,
      side: value?.side === 'left' || value?.side === 'right' ? value.side : COMPANION_CONFIG.defaultSide,
    };
  } catch {
    return { hidden: false, side: COMPANION_CONFIG.defaultSide };
  }
}

@Component({
  selector: 'app-project-companion',
  imports: [RouterLink],
  templateUrl: './project-companion.html',
  styleUrl: './project-companion.scss',
})
export class ProjectCompanion implements OnDestroy {
  readonly character = COMPANION_CONFIG;
  readonly voice = inject(GuideVoice);
  private readonly guide = inject(LessonGuide);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly preferences = readPreferences();
  readonly hidden = signal(this.preferences.hidden);
  readonly side = signal<Corner>(this.preferences.side);
  readonly open = signal(false);
  readonly draft = signal('');
  readonly busy = signal(false);
  readonly imageFailed = signal(false);
  readonly announcement = signal('');
  readonly messages = signal<GuideMessage[]>([this.welcome()]);
  readonly prompts = ['What is a map key?', 'How do places change?', 'Where does rainwater go?', 'How do I use the quizzes?'];
  private readonly questionInput = viewChild<ElementRef<HTMLInputElement>>('questionInput');
  private readonly messageList = viewChild<ElementRef<HTMLOListElement>>('messageList');
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');
  private readonly restoreButton = viewChild<ElementRef<HTMLButtonElement>>('restoreButton');
  private nextId = 1;
  private requestVersion = 0;

  private welcome(): GuideMessage {
    return { id: 0, role: 'guide', sources: [], text: `Hi, I’m ${COMPANION_CONFIG.name}! Ask me about our lessons or how to explore this app. I’ll find a helpful passage for you.` };
  }

  togglePanel(): void {
    if (this.open()) { this.closePanel(); return; }
    this.open.set(true);
    afterNextRender(() => this.questionInput()?.nativeElement.focus(), { injector: this.injector });
  }

  closePanel(restoreFocus = true): void {
    this.open.set(false);
    this.voice.stop();
    if (restoreFocus) afterNextRender(() => this.launcher()?.nativeElement.focus(), { injector: this.injector });
  }

  hide(): void {
    this.closePanel(false);
    this.hidden.set(true);
    this.savePreferences();
    afterNextRender(() => this.restoreButton()?.nativeElement.focus(), { injector: this.injector });
  }

  show(): void {
    this.hidden.set(false);
    this.savePreferences();
    afterNextRender(() => this.launcher()?.nativeElement.focus(), { injector: this.injector });
  }

  move(): void {
    this.side.update(side => side === 'right' ? 'left' : 'right');
    this.savePreferences();
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
    this.announcement.set('Looking through the lessons.');
    this.messages.update(messages => [...messages.slice(-19), { id: this.nextId++, role: 'user', text: question, sources: [] }]);
    this.scrollToLatest();
    const request = ++this.requestVersion;
    const lessonId = this.router.url.split(/[?#]/)[0].match(/^\/lessons\/([^/]+)\/?$/)?.[1];
    try {
      const answer = await this.guide.answer(question, lessonId);
      if (request !== this.requestVersion) return;
      this.messages.update(messages => [...messages.slice(-19), { id: this.nextId++, role: 'guide', ...answer }]);
      this.announcement.set(answer.text);
    } catch {
      if (request !== this.requestVersion) return;
      const text = 'I couldn’t open the lesson content. Please try again, or choose a lesson from Explore lessons.';
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
    this.requestVersion++;
    this.busy.set(false);
    this.voice.stop();
    this.messages.set([this.welcome()]);
    this.voice.error.set(null);
    this.announcement.set('A new conversation is ready.');
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

  private savePreferences(): void {
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ hidden: this.hidden(), side: this.side() })); }
    catch { /* The companion still works when browser storage is unavailable. */ }
  }

  ngOnDestroy(): void {
    this.requestVersion++;
    this.voice.stop();
  }
}
