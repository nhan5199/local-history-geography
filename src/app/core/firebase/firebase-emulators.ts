import { isDevMode } from '@angular/core';

/** Opt in before reloading: localStorage.setItem('firebase-emulators', 'true'). */
export function useFirebaseEmulators(): boolean {
  if (!isDevMode() || typeof window === 'undefined' ||
      !['localhost', '127.0.0.1'].includes(window.location.hostname)) return false;
  try { return localStorage.getItem('firebase-emulators') === 'true'; }
  catch { return false; }
}
