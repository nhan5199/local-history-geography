import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LessonGuide } from '../../data-access/lesson-guide';
import { GuideVoice } from '../../voice/guide-voice';
import type { GuideAnswer } from '../../models/guide-message';
import { signal } from '@angular/core';
import { ProjectCompanion } from './project-companion';

describe('Milo conversation lifecycle', () => {
  const answer = vi.fn<() => Promise<GuideAnswer>>();
  const stop = vi.fn();
  beforeEach(async () => {
    answer.mockReset(); stop.mockReset();
    await TestBed.configureTestingModule({ imports: [ProjectCompanion], providers: [provideRouter([]),
      { provide: LessonGuide, useValue: { answer } },
      { provide: GuideVoice, useValue: { supported: false, stop, speakingId: signal(null), error: signal(null) } },
    ] }).compileComponents();
  });
  it('ignores a pending reply when closed and allows a fresh question on reopening', async () => {
    let resolve!: (answer: GuideAnswer) => void;
    answer.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const fixture = TestBed.createComponent(ProjectCompanion); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.togglePanel(); fixture.detectChanges();
    const pending = component.ask('Nước mưa chảy đi đâu?');
    expect(component.busy()).toBe(true);
    component.closePanel();
    resolve({ text: 'outdated answer', sources: [] }); await pending;
    expect(component.messages().some(message => message.text === 'outdated answer')).toBe(false);
    expect(component.busy()).toBe(false);
    expect(stop).toHaveBeenCalled();
    answer.mockResolvedValue({ text: 'Câu trả lời mới', sources: [] });
    component.togglePanel(); await component.ask('Chú giải là gì?');
    expect(component.messages().at(-1)?.text).toBe('Câu trả lời mới');
  });
  it('shows a recoverable error and clears conversation context', async () => {
    answer.mockRejectedValue(new Error('offline'));
    const fixture = TestBed.createComponent(ProjectCompanion); fixture.detectChanges();
    await fixture.componentInstance.ask('Bài này nói gì?');
    expect(fixture.componentInstance.messages().at(-1)?.text).toContain('thử hỏi lại');
    expect(fixture.componentInstance.busy()).toBe(false);
    fixture.componentInstance.clearConversation();
    expect(fixture.componentInstance.messages()).toHaveLength(1);
  });
});
