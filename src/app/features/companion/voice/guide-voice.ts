import { Injectable, OnDestroy, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GuideVoice implements OnDestroy {
  readonly supported = typeof window !== 'undefined' &&
    'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  readonly speakingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  private current?: SpeechSynthesisUtterance;

  speak(text: string, messageId: number): void {
    this.stop();
    this.error.set(null);
    if (!this.supported) return;

    try {
      const speech = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const vietnamese = voices.filter(voice => voice.lang.toLowerCase().startsWith('vi'));
      speech.voice = vietnamese.find(voice => voice.localService) ?? vietnamese[0] ?? null;
      speech.lang = speech.voice?.lang ?? 'vi-VN';
      speech.rate = 0.9;
      this.current = speech;
      this.speakingId.set(messageId);
      speech.onend = () => {
        if (this.current !== speech) return;
        this.current = undefined;
        this.speakingId.set(null);
      };
      speech.onerror = event => {
        if (this.current !== speech) return;
        this.current = undefined;
        this.speakingId.set(null);
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          this.error.set('Chưa phát được giọng đọc. Em vẫn có thể đọc câu trả lời nhé.');
        }
      };
      window.speechSynthesis.speak(speech);
    } catch {
      this.current = undefined;
      this.speakingId.set(null);
      this.error.set('Chưa có giọng đọc lúc này. Em vẫn có thể đọc câu trả lời nhé.');
    }
  }

  stop(): void {
    const ownedSpeech = this.current;
    this.current = undefined;
    this.speakingId.set(null);
    if (ownedSpeech && this.supported) window.speechSynthesis.cancel();
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
