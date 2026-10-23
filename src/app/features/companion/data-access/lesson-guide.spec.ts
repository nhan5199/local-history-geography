import { TestBed } from '@angular/core/testing';
import { PublicCatalogContext } from '../../../shared/data-access/public-catalog-context';
import { LessonGuide } from './lesson-guide';

describe('Milo content retrieval', () => {
  let guide: LessonGuide;
  beforeEach(() => { TestBed.configureTestingModule({}); guide = TestBed.inject(LessonGuide); });

  it.each(['Chú giải bản đồ là gì?', 'chu giai ban do la gi', 'What is a map key?'])('answers %s from a visible lesson passage', async question => {
    const answer = await guide.answer(question);
    expect(answer.text).toContain('Chú giải');
    expect(answer.sources[0].url).toBe('/lessons/read-a-neighborhood-map#section-0');
    expect(answer.text).toContain('bài mẫu');
  });
  it('understands Vietnamese water questions and retains the topic for an example', async () => {
    const first = await guide.answer('Nước mưa chảy đi đâu?');
    expect(first.text).toContain('nơi cao xuống nơi thấp');
    const followup = await guide.answer('Cho em ví dụ', { previousSourceKey: first.sources[0].key });
    expect(followup.text).toContain('chỗ an toàn');
    expect(followup.sources[0].key).toBe(first.sources[0].key);
    const more = await guide.answer('Nói thêm', { previousSourceKey: first.sources[0].key });
    expect(more.text).toContain('thượng nguồn');
  });
  it('uses the current lesson and clarifies context-free follow-ups', async () => {
    const answer = await guide.answer('Bài này nói gì?', { url: '/lessons/stories-of-a-landmark' });
    expect(answer.sources[0].url).toContain('stories-of-a-landmark');
    const example = await guide.answer('Cho em ví dụ', { url: '/lessons/stories-of-a-landmark' });
    expect(example.text).toContain('phác họa');
    const ambiguous = await guide.answer('Cho em ví dụ');
    expect(ambiguous.sources).toEqual([]);
    expect(ambiguous.text).toContain('điều gì');
  });
  it.each(['Mở trò chơi ở đâu?', 'Mở tủ sách', 'Mở góc 360°', 'Đăng nhập giáo viên'])('finds public site guidance for %s', async question => {
    const answer = await guide.answer(question);
    expect(answer.sources[0]?.key).toMatch(/^site:/);
  });
  it('distinguishes teacher login from anonymous learning', async () => {
    expect((await guide.answer('Đăng nhập giáo viên')).text).toContain('quản trị viên cấp');
  });
  it.each(['Who built the bridge in my town?', 'Đồng Nai thành lập năm nào?', 'water aliens spaceship', 'Hôm nay trời có mưa không?'])('does not invent an answer for %s', async question => {
    const answer = await guide.answer(question);
    expect(answer.sources).toEqual([]);
  });
  it('uses updated public metadata without querying or keeping deleted entries', async () => {
    const catalog = TestBed.inject(PublicCatalogContext);
    catalog.replace('books', [{ id: 'rung', title: 'Rừng xanh quanh em', description: 'Sách ảnh về cây xanh.' }]);
    expect((await guide.answer('Rừng xanh quanh em')).sources[0].url).toBe('/books/rung');
    catalog.replace('books', []);
    expect((await guide.answer('Rừng xanh quanh em')).sources).toEqual([]);
  });
});
