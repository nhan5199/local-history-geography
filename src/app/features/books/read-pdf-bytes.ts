/** Limit remote and local PDFs before handing their bytes to PDF.js. */
export async function readPdfBytes(url: string, signal: AbortSignal, maxBytes = 10 * 1024 * 1024): Promise<Uint8Array> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Không tải được tệp PDF.');
  const announcedSize = Number(response.headers.get('content-length'));
  if (announcedSize > maxBytes) throw new Error('Tệp PDF vượt quá giới hạn 10 MiB.');
  if (!response.body) throw new Error('Trình duyệt không đọc được tệp PDF.');

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error('Tệp PDF vượt quá giới hạn 10 MiB.');
      chunks.push(value);
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (new TextDecoder('ascii').decode(bytes.subarray(0, 5)) !== '%PDF-') {
    throw new Error('Tệp này không phải PDF hợp lệ.');
  }
  return bytes;
}
