import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeacherAuthService } from '../../core/firebase/teacher-auth.service';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import { QUESTION_TYPE_LABELS, type BankQuestion, type LearningQuestion, type QuestionSet } from '../../core/firebase/question.models';

type BankSort = 'newest' | 'oldest' | 'easiest' | 'hardest';

@Component({
  selector: 'app-question-bank-page',
  imports: [RouterLink],
  templateUrl: './question-bank-page.html',
  styleUrl: './question-bank-page.scss',
})
export class QuestionBankPage implements OnInit {
  readonly auth = inject(TeacherAuthService);
  private readonly library = inject(QuestionLibraryService);
  readonly labels = QUESTION_TYPE_LABELS;
  readonly mode = signal<QuestionSet['mode']>('questions');
  readonly bank = signal<BankQuestion[]>([]);
  readonly loading = signal(false);
  readonly publishing = signal(false);
  readonly error = signal('');
  readonly loadError = signal(false);
  readonly success = signal('');
  readonly sort = signal<BankSort>('newest');
  readonly difficulty = signal('all');
  readonly search = signal('');
  readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  readonly preparedIds = signal<string[]>([]);
  readonly randomCount = signal('1');
  readonly title = signal('');
  private loadRevision = 0;
  readonly filtered = computed(() => {
    const difficulty = this.difficulty();
    const query = this.normalize(this.search().trim());
    const sort = this.sort();
    return this.bank()
      .filter(question => (difficulty === 'all' || question.difficulty === Number(difficulty)) &&
        (!query || this.normalize([question.prompt, ...question.options, ...question.answers].join(' ')).includes(query)))
      .sort((a, b) => {
        switch (sort) {
          case 'oldest': return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
          case 'easiest': return a.difficulty - b.difficulty || b.createdAt - a.createdAt;
          case 'hardest': return b.difficulty - a.difficulty || b.createdAt - a.createdAt;
          default: return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
        }
      });
  });
  readonly prepared = computed(() => {
    const byId = new Map(this.bank().map(question => [question.id, question]));
    return this.preparedIds().map(id => byId.get(id)).filter((question): question is BankQuestion => !!question);
  });

  async ngOnInit(): Promise<void> {
    try {
      await this.auth.initialize();
      if (this.auth.isTeacher()) await this.load();
    } catch {
      this.error.set('Chưa kiểm tra được tài khoản giáo viên. Vui lòng thử lại.');
    }
  }

  async load(refresh = false): Promise<void> {
    if (!this.auth.isTeacher()) return;
    const revision = ++this.loadRevision;
    const mode = this.mode();
    this.loading.set(true);
    this.error.set('');
    this.loadError.set(false);
    try {
      const questions = await this.library.listBank(mode, refresh);
      if (revision !== this.loadRevision) return;
      this.bank.set(questions);
      this.selectedIds.set(new Set());
      this.preparedIds.set([]);
    } catch (error) {
      if (revision !== this.loadRevision) return;
      this.error.set(error instanceof Error && error.message ? error.message : 'Chưa tải được ngân hàng câu hỏi. Vui lòng thử lại.');
      this.loadError.set(true);
    } finally {
      if (revision === this.loadRevision) this.loading.set(false);
    }
  }

  changeMode(mode: QuestionSet['mode']): void {
    if (mode === this.mode() || this.publishing()) return;
    this.mode.set(mode);
    this.bank.set([]);
    this.selectedIds.set(new Set());
    this.preparedIds.set([]);
    this.difficulty.set('all');
    this.search.set('');
    this.title.set('');
    this.success.set('');
    void this.load();
  }

  changeDifficulty(value: string): void {
    this.difficulty.set(value);
    this.pruneSelection();
  }

  changeSearch(value: string): void {
    this.search.set(value);
    this.pruneSelection();
  }

  changeSort(value: string): void {
    if (['newest', 'oldest', 'easiest', 'hardest'].includes(value)) this.sort.set(value as BankSort);
    this.preparedIds.set([]);
  }

  toggleQuestion(id: string): void {
    if (this.publishing() || !this.filtered().some(question => question.id === id)) return;
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else if (next.size < 100) next.add(id);
    this.selectedIds.set(next);
    this.preparedIds.set([]);
    this.success.set('');
  }

  prepareSelected(): void {
    const ids = this.filtered().filter(question => this.selectedIds().has(question.id)).map(question => question.id);
    if (!ids.length) { this.error.set('Hãy chọn ít nhất một câu hỏi để xem trước.'); return; }
    this.error.set('');
    this.preparedIds.set(ids);
  }

  prepareRandom(): void {
    const countText = this.randomCount().trim();
    const pool = this.filtered();
    if (!/^[1-9]\d*$/.test(countText) || Number(countText) > 100 || Number(countText) > pool.length) {
      this.error.set(`Nhập số câu từ 1 đến ${Math.min(100, pool.length)} trong danh sách đang lọc.`);
      return;
    }
    const shuffled = [...pool];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const choice = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[choice]] = [shuffled[choice], shuffled[index]];
    }
    const ids = shuffled.slice(0, Number(countText)).map(question => question.id);
    this.selectedIds.set(new Set(ids));
    this.preparedIds.set(ids);
    this.error.set('');
    this.success.set('');
  }

  async publish(): Promise<void> {
    if (this.publishing() || !this.auth.isTeacher() || !this.title().trim() || !this.prepared().length) return;
    this.publishing.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const questions: LearningQuestion[] = this.prepared().map(({ id, type, prompt, options, answers, explanation, difficulty }) =>
        ({ id, type, prompt, options: [...options], answers: [...answers], explanation, difficulty }));
      await this.library.create(this.title().trim(), this.mode(), questions);
      this.success.set(`Đã đăng bài “${this.title().trim()}” gồm ${questions.length} câu.`);
      this.title.set('');
      this.selectedIds.set(new Set());
      this.preparedIds.set([]);
    } catch (error) {
      this.error.set(error instanceof Error && error.message ? error.message : 'Chưa đăng được bài. Bản xem trước vẫn ở đây để thầy cô thử lại.');
    } finally {
      this.publishing.set(false);
    }
  }

  answer(question: BankQuestion): string {
    return question.type === 'yesno' ? (question.answers[0] === 'true' ? 'Đúng' : 'Sai') : question.answers.join(' · ');
  }

  date(timestamp: number): string {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp);
  }

  private pruneSelection(): void {
    const allowed = new Set(this.filtered().map(question => question.id));
    this.selectedIds.set(new Set([...this.selectedIds()].filter(id => allowed.has(id))));
    this.preparedIds.set([]);
    this.success.set('');
  }

  private normalize(value: string): string {
    return value.toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
  }
}
