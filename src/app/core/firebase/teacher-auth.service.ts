import { inject, Injectable, signal, type OnDestroy } from '@angular/core';
import type { Auth, User } from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { RealtimeDatabaseService } from './realtime-database.service';
import { useFirebaseEmulators } from './firebase-emulators';

const USERNAME_DOMAIN = 'teachers.local-history-geography.app';

/** Email/Password sign-in with an independently checked teacher role. */
@Injectable({ providedIn: 'root' })
export class TeacherAuthService implements OnDestroy {
  private readonly firebase = inject(FirebaseService);
  private readonly database = inject(RealtimeDatabaseService);
  readonly user = signal<User | null>(null);
  readonly ready = signal(false);
  readonly isTeacher = signal(false);
  readonly error = signal('');
  private authPromise?: Promise<Auth>;
  private initPromise?: Promise<void>;
  private roleRevision = 0;
  private unsubscribe?: () => void;

  private async getAuth(): Promise<Auth> {
    return this.authPromise ??= (async () => {
      const [app, sdk] = await Promise.all([this.firebase.initialize(), import('firebase/auth')]);
      const auth = sdk.getAuth(app);
      if (useFirebaseEmulators()) sdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      return auth;
    })().catch(error => { this.authPromise = undefined; throw error; });
  }

  initialize(): Promise<void> {
    return this.initPromise ??= this.observe().catch(error => {
      this.ready.set(true);
      this.error.set('Không thể kết nối tài khoản giáo viên. Vui lòng thử lại.');
      this.initPromise = undefined;
      throw error;
    });
  }

  private async observe(): Promise<void> {
    const auth = await this.getAuth();
    const sdk = await import('firebase/auth');
    await new Promise<void>((resolve, reject) => {
      let initial = true;
      this.unsubscribe = sdk.onAuthStateChanged(auth, current => {
        void this.checkRole(current).then(() => {
          if (initial) { initial = false; resolve(); }
        }).catch(error => {
          if (initial) { initial = false; this.unsubscribe?.(); this.unsubscribe = undefined; reject(error); }
          else this.error.set('Không thể kiểm tra quyền giáo viên.');
        });
      }, error => { this.unsubscribe?.(); this.unsubscribe = undefined; reject(error); });
    });
    this.ready.set(true);
  }

  private async checkRole(current: User | null): Promise<boolean> {
    const revision = ++this.roleRevision;
    this.user.set(current);
    this.isTeacher.set(false);
    if (!current) return false;
    try {
      const token = await current.getIdTokenResult();
      let teacher = token.claims['contentEditor'] === true;
      if (!teacher) teacher = await this.database.read(`teachers/${current.uid}`) === true;
      if (revision === this.roleRevision) this.isTeacher.set(teacher);
      return teacher;
    } catch (error) {
      if (revision === this.roleRevision) this.error.set('Không thể kiểm tra quyền giáo viên.');
      throw error;
    }
  }

  async login(username: string, password: string): Promise<void> {
    await this.initialize();
    this.error.set('');
    const name = username.trim().toLowerCase();
    if (!name || !password || (!name.includes('@') && !/^[a-z0-9._-]{3,64}$/.test(name))) {
      this.error.set('Nhập tên đăng nhập và mật khẩu hợp lệ.');
      throw new Error(this.error());
    }
    const email = name.includes('@') ? name : `${name}@${USERNAME_DOMAIN}`;
    try {
      const auth = await this.getAuth();
      const { signInWithEmailAndPassword, signOut } = await import('firebase/auth');
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const teacher = await this.checkRole(credential.user);
      if (!teacher) {
        await signOut(auth);
        throw new Error('Tài khoản này chưa được cấp quyền giáo viên.');
      }
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith('Tài khoản này')
        ? error.message : 'Đăng nhập không thành công. Kiểm tra tài khoản, mật khẩu và kết nối mạng.';
      this.error.set(message);
      throw new Error(message, { cause: error });
    }
  }

  async logout(): Promise<void> {
    const { signOut } = await import('firebase/auth');
    await signOut(await this.getAuth());
    this.user.set(null);
    this.isTeacher.set(false);
    this.error.set('');
  }

  ngOnDestroy(): void { this.unsubscribe?.(); }
}
