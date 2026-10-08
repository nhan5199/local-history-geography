import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeacherAuthService } from '../../core/firebase/teacher-auth.service';
import { QuestionLibraryService } from '../../core/firebase/question-library.service';
import { downloadQuestionTemplate, parseQuestionExcel } from '../../core/firebase/question-excel';
import { QUESTION_TYPE_LABELS, type LearningQuestion, type QuestionSet } from '../../core/firebase/question.models';

@Component({
  selector: 'app-teacher-page',
  imports: [RouterLink],
  templateUrl: './teacher-page.html',
  styleUrl: './teacher-page.scss',
})
export class TeacherPage implements OnInit {
  readonly auth = inject(TeacherAuthService);
  private readonly library = inject(QuestionLibraryService);
  readonly labels = QUESTION_TYPE_LABELS;
  readonly mode = signal<QuestionSet['mode']>('questions');
  readonly username = signal('');
  readonly password = signal('');
  readonly title = signal('');
  readonly createTest = signal(false);
  readonly fileName = signal('');
  readonly preview = signal<LearningQuestion[]>([]);
  readonly busy = signal(false);
  readonly templateBusy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private selectionVersion = 0;

  ngOnInit(): void {
    void this.auth.initialize().catch(() => {
      this.error.set('Chưa kết nối được tài khoản giáo viên. Vui lòng tải lại trang để thử lại.');
    });
  }

  async login(): Promise<void> {
    if (this.busy() || !this.username().trim() || !this.password()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.username().trim(), this.password());
      this.password.set('');
      if (!this.auth.isTeacher()) this.error.set('Tài khoản này chưa có quyền biên tập nội dung.');
    } catch {
      this.error.set(this.auth.error() || 'Đăng nhập chưa thành công. Kiểm tra tài khoản và mật khẩu rồi thử lại.');
    } finally {
      this.busy.set(false);
    }
  }

  async logout(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.logout();
      this.clearDraft();
    } catch {
      this.error.set('Chưa đăng xuất được. Vui lòng thử lại.');
    } finally {
      this.busy.set(false);
    }
  }

  changeMode(mode: QuestionSet['mode']): void {
    if (this.busy()) return;
    this.mode.set(mode);
    this.clearDraft();
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';
  }

  async downloadTemplate(): Promise<void> {
    if (this.templateBusy()) return;
    this.templateBusy.set(true);
    this.error.set('');
    try {
      await downloadQuestionTemplate(this.mode());
    } catch {
      this.error.set('Chưa tạo được tệp Excel mẫu. Vui lòng thử lại.');
    } finally {
      this.templateBusy.set(false);
    }
  }

  async chooseFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    const version = ++this.selectionVersion;
    this.preview.set([]);
    this.fileName.set(file?.name ?? '');
    this.error.set('');
    this.success.set('');
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      this.error.set('Hãy chọn tệp Excel .xlsx theo mẫu.');
      return;
    }
    this.busy.set(true);
    try {
      const questions = await parseQuestionExcel(file, this.mode());
      if (version === this.selectionVersion) this.preview.set(questions);
    } catch (error) {
      if (version === this.selectionVersion) {
        this.error.set(error instanceof Error ? error.message : 'Không đọc được tệp Excel. Vui lòng kiểm tra mẫu và thử lại.');
      }
    } finally {
      if (version === this.selectionVersion) this.busy.set(false);
    }
  }

  async publish(fileInput: HTMLInputElement): Promise<void> {
    if (this.busy() || !this.auth.isTeacher() || (this.createTest() && !this.title().trim()) || !this.preview().length) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    try {
      await this.library.importQuestions(this.title().trim(), this.mode(), this.preview(), this.createTest());
      this.success.set(this.createTest()
        ? `Đã lưu ${this.preview().length} câu vào ngân hàng và đăng bài “${this.title().trim()}”.`
        : `Đã lưu ${this.preview().length} câu vào ngân hàng ${this.mode() === 'questions' ? 'câu hỏi' : 'trò chơi'}.`);
      this.clearDraft(false);
      fileInput.value = '';
    } catch (error) {
      this.error.set(error instanceof Error && error.message
        ? error.message
        : 'Chưa đăng được bộ câu hỏi. Nội dung vẫn ở đây để thầy cô thử lại.');
    } finally {
      this.busy.set(false);
    }
  }

  private clearDraft(clearMessages = true): void {
    ++this.selectionVersion;
    this.title.set('');
    this.createTest.set(false);
    this.preview.set([]);
    this.fileName.set('');
    if (clearMessages) { this.error.set(''); this.success.set(''); }
  }
}
