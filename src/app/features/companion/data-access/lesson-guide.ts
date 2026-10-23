import { inject, Injectable } from '@angular/core';
import { PublicCatalogContext } from '../../../shared/data-access/public-catalog-context';
import type { GuideAnswer, GuideContext } from '../models/guide-message';
import { normalize, terms } from './guide-language';
import { SITE_GUIDE, type GuidePassage } from './site-guide-content';

const STARTERS = ['Chú giải bản đồ là gì?', 'Nước mưa chảy đi đâu?', 'Mở trò chơi ở đâu?'];
const FOLLOW_UP = /^(vi du|cho vi du|cho em vi du|noi them|ke them|con nua|giai thich them|tai sao|why|example|give me an example|tell me more)$/;

/** Deterministic local retrieval: reads the same content as pages, never a model API. */
@Injectable({ providedIn: 'root' })
export class LessonGuide {
  private readonly catalog = inject(PublicCatalogContext);

  async answer(question: string, context: GuideContext = {}): Promise<GuideAnswer> {
    const query = normalize(question.slice(0, 400));
    const path = context.url?.split(/[?#]/)[0] ?? '/';
    const say = (text: string, suggestions = STARTERS): GuideAnswer => ({ text, sources: [], suggestions });
    if (/^(hi|hello|hey|xin chao|chao|chao milo|cam on|thank you|thanks)$/.test(query)) {
      return say('Chào em! Milo giúp tìm ý trong bài học và chỉ đường khám phá. Em muốn tìm hiểu điều gì?');
    }
    if (/\b(luu cuoc tro chuyen|nho cuoc tro chuyen|save chat|chat history)\b/.test(query)) {
      return say('Cuộc trò chuyện chỉ ở trong lần mở trang này. Tải lại trang sẽ bắt đầu lại.');
    }
    if (/\b(nghe cau tra loi|doc thanh tieng|tat giong|listen|voice)\b/.test(query)) {
      return say('Bấm nút nghe dưới câu trả lời. Bấm dừng hoặc đóng Milo để ngừng đọc. Giọng đọc tùy trình duyệt và thiết bị.');
    }
    // No sample or navigation record can establish a real place's dates or identities.
    if (/\b(ai xay|ai lap|thanh lap|nam nao|bao nhieu dan|dien tich|who built|who founded|what year|when was|population)\b/.test(query)) {
      return say('Milo chưa có nguồn trên trang để xác nhận tên, số liệu hoặc mốc thời gian đó. Em có thể hỏi giáo viên hoặc xem tài liệu đã được kiểm chứng.');
    }
    const { SAMPLE_LESSONS } = await import('../../lessons/data/sample-lessons');
    const lessons: GuidePassage[] = SAMPLE_LESSONS.flatMap(lesson => lesson.sections.map((section, index) => ({
      key: `${lesson.id}:${index}`, title: lesson.title, url: `/lessons/${lesson.id}#section-${index}`,
      text: section.bodyVi ?? section.body, example: section.tryItVi ?? section.tryIt,
      keywords: `${lesson.title} ${lesson.category} ${section.heading} ${section.body}`, sample: true,
    })));
    const catalogs: GuidePassage[] = this.catalog.entries().map(entry => ({
      key: `catalog:${entry.kind}:${entry.id}`, title: entry.title, text: entry.description || 'Chọn thẻ này trong thư viện để khám phá.',
      keywords: entry.title, url: entry.kind === 'books' ? `/books/${encodeURIComponent(entry.id)}` : `/${entry.kind}`,
    }));
    const all: readonly GuidePassage[] = [...lessons, ...SITE_GUIDE, ...catalogs];
    const reply = (passage: GuidePassage, example = false): GuideAnswer => ({
      text: `${passage.sample ? 'Trong bài mẫu: ' : ''}${example && passage.example ? passage.example : passage.text}`,
      sources: [{ key: passage.key, title: passage.title, url: passage.url }],
      suggestions: passage.example ? ['Cho em ví dụ', 'Nói thêm'] : ['Chú giải bản đồ là gì?', 'Nước mưa chảy đi đâu?'],
    });
    if (FOLLOW_UP.test(query)) {
      const prior = all.find(passage => passage.key === context.previousSourceKey)
        ?? lessons.find(passage => passage.url.split('#')[0] === path);
      if (!prior) return say('Em muốn Milo giải thích thêm về điều gì?', STARTERS);
      if (/vi du|example/.test(query)) return prior.example ? reply(prior, true) : say('Em muốn tìm ví dụ về chủ đề nào trong bài học?', STARTERS);
      if (/tai sao|why/.test(query)) return say('Em muốn hỏi vì sao về ý nào? Gõ thêm ý đó để Milo tìm đúng đoạn nhé.', [prior.title]);
      const sibling = lessons.find(passage => passage.key !== prior.key && passage.url.split('#')[0] === prior.url.split('#')[0]);
      return reply(sibling ?? prior);
    }
    if (/^(bai nay|bai nay noi gi|giai thich bai nay|trang nay|trang nay lam gi|what am i learning|explain this lesson|this lesson|help)$/.test(query)) {
      const current = lessons.find(passage => passage.url.split('#')[0] === path) ?? SITE_GUIDE.find(passage => passage.url === path);
      return current ? reply(current) : say('Em muốn đọc bài, xem bản đồ hay chơi thử?', ['Mở bài học', 'Mở bản đồ', 'Mở trò chơi']);
    }

    const tokens = terms(query);
    const navigation = /\b(mo|tim|trang|su dung|cach dung|choi|dang nhap|mat khau|how to|open|login)\b/.test(query);
    const ranked = all.map(passage => {
      const title = new Set(terms(`${passage.title} ${passage.key.startsWith('site:') ? passage.keywords : ''}`));
      const body = new Set(terms(`${passage.text} ${passage.keywords}`));
      const matches = tokens.filter(token => title.has(token) || body.has(token));
      const coverage = matches.length / Math.max(tokens.length, 1);
      const score = matches.reduce((total, token) => total + (title.has(token) ? 3 : 1), 0)
        + (passage.url.split('#')[0] === path ? .5 : 0)
        + (navigation === passage.key.startsWith('site:') ? 1 : 0);
      return { passage, matches: matches.length, coverage, score };
    }).filter(item => item.matches > 0 && item.coverage >= .6).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best) return say('Milo chưa tìm thấy câu trả lời trong nội dung hiện có. Em thử nêu rõ chủ đề hoặc chọn một gợi ý nhé.');
    return reply(best.passage);
  }
}
