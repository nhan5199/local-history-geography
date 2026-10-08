import { readPdfBytes } from './read-pdf-bytes';

describe('readPdfBytes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a real PDF signature within the byte limit', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.7\nhello');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes)));
    const result = await readPdfBytes('/book.pdf', new AbortController().signal, bytes.length);
    expect(Array.from(result)).toEqual(Array.from(bytes));
  });

  it('rejects an overlarge stream even without a content-length header', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('%PDF-1234'));
        controller.enqueue(new Uint8Array(10));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)));
    await expect(readPdfBytes('/book.pdf', new AbortController().signal, 10))
      .rejects.toThrow('giới hạn');
  });

  it('rejects a file whose bytes are not PDF', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not a pdf')));
    await expect(readPdfBytes('/book.pdf', new AbortController().signal)).rejects.toThrow('PDF hợp lệ');
  });
});
