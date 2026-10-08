/**
 * Publish only the two bundled viewer demos. Dry-run by default.
 * Authentication uses the account from `firebase login`; no credential file is read here.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const projectId = 'local-history-geography';
const bucket = `${projectId}.firebasestorage.app`;
const databaseUrl = `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const root = new URL('../', import.meta.url);
const localOrigins = ['http://localhost:4200', 'http://127.0.0.1:4200'];
const assets = [
  {
    id: 'demo-book', kind: 'book', file: 'public/demo/tracemonkey.pdf',
    contentType: 'application/pdf', maxBytes: 10 * 1024 * 1024,
    title: 'Cuốn sách thử nghiệm',
    description: 'PDF mẫu để thử lật trang. Đây không phải tài liệu học tập Đồng Nai.',
    attribution: 'Mozilla PDF.js sample: Trace-based Just-in-Time Type Specialization for Dynamic Languages.',
  },
  {
    id: 'demo-panorama', kind: 'panorama', file: 'public/demo/alma.jpg',
    contentType: 'image/jpeg', maxBytes: 5 * 1024 * 1024,
    title: 'Một chuyến đi 360°',
    description: 'Ảnh toàn cảnh mẫu từ Pannellum, không phải địa điểm ở Đồng Nai.',
    attribution: 'ALMA Observatory — Pannellum / Matthew Petroff, CC BY-SA 4.0.',
  },
];

function jpegDimensions(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error('JPEG signature is invalid');
  let offset = 2;
  while (offset < bytes.length - 9) {
    if (bytes[offset++] !== 0xff) throw new Error('JPEG marker is invalid');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) throw new Error('JPEG segment is invalid');
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 7) throw new Error('JPEG dimensions are invalid');
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions were not found');
}

async function prepare(asset) {
  const bytes = await readFile(new URL(asset.file, root));
  if (!bytes.length || bytes.length > asset.maxBytes) throw new Error(`${asset.file}: size exceeds limit`);
  if (asset.kind === 'book' && bytes.toString('ascii', 0, 5) !== '%PDF-') throw new Error(`${asset.file}: PDF signature is invalid`);
  if (asset.kind === 'panorama') {
    const { width, height } = jpegDimensions(bytes);
    if (!width || width !== 2 * height || width > 8192) throw new Error(`${asset.file}: panorama must be 2:1 and at most 8192 pixels wide`);
  }
  const storagePath = `published/media/${asset.kind}/${asset.id}.${asset.kind === 'book' ? 'pdf' : 'jpg'}`;
  const record = {
    id: asset.id, kind: asset.kind, title: asset.title, description: asset.description,
    attribution: asset.attribution, storagePath, published: true, size: bytes.length,
  };
  return {
    ...asset, bytes, storagePath, record,
    md5: createHash('md5').update(bytes).digest('base64'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

function sameRecord(actual, expected) {
  return actual && typeof actual === 'object' && !Array.isArray(actual) &&
    Object.keys(actual).length === Object.keys(expected).length &&
    Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function getCliToken() {
  let auth, scopes;
  try {
    auth = require('firebase-tools/lib/auth.js');
    scopes = require('firebase-tools/lib/scopes.js');
  }
  catch { throw new Error('firebase-tools is missing. Run npm install, then npx firebase login.'); }
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI is not signed in. Run npx firebase login.');
  const cliScopes = [scopes.EMAIL, scopes.OPENID, scopes.CLOUD_PROJECTS_READONLY,
    scopes.FIREBASE_PLATFORM, scopes.CLOUD_PLATFORM];
  return auth.getAccessToken(account.tokens.refresh_token, cliScopes)
    .then(tokens => {
      if (!tokens?.access_token) throw new Error('Firebase CLI could not refresh its login. Run npx firebase login --reauth.');
      return tokens.access_token;
    })
    .catch(() => { throw new Error('Firebase CLI could not refresh its login. Run npx firebase login --reauth.'); });
}

async function request(token, method, url, { body, headers = {}, allowed = [200] } = {}) {
  const response = await fetch(url, {
    method, body, headers: { Authorization: `Bearer ${token}`, ...headers },
  });
  if (!allowed.includes(response.status)) {
    // Never print the response body: authentication errors may include sensitive details.
    throw new Error(`${method} ${new URL(url).host} failed (HTTP ${response.status})`);
  }
  return response;
}

function objectUrl(storagePath) {
  return `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(storagePath)}`;
}

function recordUrl(asset) {
  return `${databaseUrl}/media/${asset.kind}/${asset.id}.json`;
}

async function inspect(token, asset) {
  const [objectResponse, recordResponse] = await Promise.all([
    request(token, 'GET', objectUrl(asset.storagePath), { allowed: [200, 404] }),
    request(token, 'GET', recordUrl(asset), { headers: { 'X-Firebase-ETag': 'true' } }),
  ]);
  const object = objectResponse.status === 404 ? null : await objectResponse.json();
  const record = await recordResponse.json();
  const etag = recordResponse.headers.get('etag');
  if (!etag) throw new Error(`${asset.id}: Realtime Database did not return an ETag`);
  if (object && (object.md5Hash !== asset.md5 || Number(object.size) !== asset.bytes.length ||
      object.contentType !== asset.contentType ||
      object.metadata?.sha256 && object.metadata.sha256 !== asset.sha256 ||
      !object.metadata?.firebaseStorageDownloadTokens)) {
    throw new Error(`${asset.id}: existing Storage object differs; refusing to overwrite`);
  }
  if (record !== null && !sameRecord(record, asset.record)) {
    throw new Error(`${asset.id}: existing database record differs; refusing to overwrite`);
  }
  return { object, record, etag };
}

async function upload(token, asset) {
  const boundary = `demo-${randomUUID()}`;
  const metadata = {
    name: asset.storagePath, contentType: asset.contentType,
    cacheControl: 'public,max-age=86400',
    metadata: { sha256: asset.sha256, source: 'bundled-demo', firebaseStorageDownloadTokens: randomUUID() },
  };
  const head = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${asset.contentType}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=multipart&ifGenerationMatch=0&name=${encodeURIComponent(asset.storagePath)}`;
  const response = await request(token, 'POST', url, {
    body: Buffer.concat([head, asset.bytes, tail]),
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    allowed: [200, 201],
  });
  return response.json();
}

async function publishRecord(token, asset, etag) {
  await request(token, 'PUT', recordUrl(asset), {
    body: JSON.stringify(asset.record),
    headers: { 'Content-Type': 'application/json', 'if-match': etag },
    allowed: [200],
  });
}

async function deleteNewObject(token, asset, generation) {
  const url = `${objectUrl(asset.storagePath)}?ifGenerationMatch=${encodeURIComponent(generation)}`;
  await request(token, 'DELETE', url, { allowed: [204] });
}

function validOrigin(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error(`Invalid CORS origin: ${input}`); }
  const loopback = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.origin !== input || url.username || url.password ||
      !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) {
    throw new Error(`CORS origin must be an HTTPS origin or local HTTP origin: ${input}`);
  }
  return input;
}

async function ensureCors(token, origins) {
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}`;
  const response = await request(token, 'GET', `${url}?fields=cors,metageneration`);
  const current = await response.json();
  if (!current.metageneration) throw new Error('Bucket metageneration was not returned');
  const cors = Array.isArray(current.cors) ? current.cors : [];
  const missing = origins.filter(origin => !cors.some(rule =>
    rule.origin?.includes(origin) && rule.method?.includes('GET') && rule.method?.includes('HEAD')));
  if (!missing.length) {
    console.log('Bucket CORS already covers requested origins');
    return;
  }
  const next = [...cors, {
    origin: missing, method: ['GET', 'HEAD'],
    responseHeader: ['Content-Type', 'Content-Length', 'Accept-Ranges', 'Content-Range'],
    maxAgeSeconds: 3600,
  }];
  await request(token, 'PATCH', `${url}?ifMetagenerationMatch=${encodeURIComponent(current.metageneration)}`, {
    body: JSON.stringify({ cors: next }),
    headers: { 'Content-Type': 'application/json' },
    allowed: [200],
  });
  console.log(`Bucket CORS added for: ${missing.join(', ')}`);
}

async function main() {
  const args = process.argv.slice(2);
  const origins = [...localOrigins];
  for (let index = 0; index < args.length; index++) {
    if (args[index] !== '--cors-origin') continue;
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('--cors-origin needs a full origin');
    origins.push(validOrigin(args[index + 1]));
    args.splice(index, 2);
    index--;
  }
  if (args.some(arg => !['--apply', '--help'].includes(arg)) || args.includes('--apply') && args.includes('--help')) {
    throw new Error('Usage: node scripts/publish-demo-media.mjs [--apply] [--cors-origin https://site.example]');
  }
  if (args.includes('--help')) {
    console.log('Dry run: node scripts/publish-demo-media.mjs\nPublish: node scripts/publish-demo-media.mjs --apply [--cors-origin https://site.example]');
    return;
  }
  const prepared = await Promise.all(assets.map(prepare));
  console.log(`Project: ${projectId}; bucket: ${bucket}`);
  for (const asset of prepared) console.log(`${asset.file} (${asset.bytes.length} bytes) -> ${asset.storagePath}; media/${asset.kind}/${asset.id}`);
  console.log(`CORS origins: ${[...new Set(origins)].join(', ')}`);
  if (!args.includes('--apply')) {
    console.log('Dry run complete. No Firebase request was made.');
    return;
  }
  const token = await getCliToken();
  // Preflight both records before any write. A changed target stops the whole run.
  const states = await Promise.all(prepared.map(asset => inspect(token, asset)));
  await ensureCors(token, [...new Set(origins)]);
  for (let index = 0; index < prepared.length; index++) {
    const asset = prepared[index];
    const state = states[index];
    if (state.object && state.record) {
      console.log(`${asset.id}: already published`);
      continue;
    }
    let newGeneration;
    let preserveObject = false;
    try {
      if (!state.object) {
        const created = await upload(token, asset);
        newGeneration = created.generation;
        if (!newGeneration) throw new Error(`${asset.id}: upload response lacked a generation; inspect ${asset.storagePath}`);
        if (created.md5Hash !== asset.md5 || Number(created.size) !== asset.bytes.length ||
            !created.metadata?.firebaseStorageDownloadTokens) {
          throw new Error(`${asset.id}: uploaded object verification failed`);
        }
      }
      if (state.record === null) {
        try { await publishRecord(token, asset, state.etag); }
        catch (error) {
          // A failed response can arrive after the database committed the PUT.
          // Preserve the object whenever the record exists or cannot be checked.
          let current;
          try {
            const response = await request(token, 'GET', recordUrl(asset));
            current = await response.json();
          } catch {
            preserveObject = true;
            throw new Error(`${asset.id}: database write outcome is unknown; preserve ${asset.storagePath} and rerun`, { cause: error });
          }
          if (sameRecord(current, asset.record)) {
            console.log(`${asset.id}: database write committed`);
            continue;
          }
          if (current !== null) {
            preserveObject = true;
            throw new Error(`${asset.id}: database record changed; preserve ${asset.storagePath} and inspect manually`, { cause: error });
          }
          throw error;
        }
      }
    } catch (error) {
      if (newGeneration && !preserveObject) {
        try { await deleteNewObject(token, asset, newGeneration); }
        catch { throw new Error(`${asset.id}: publish failed and new object cleanup failed; inspect ${asset.storagePath} manually`, { cause: error }); }
      }
      throw error;
    }
    console.log(`${asset.id}: published`);
  }
}

main().catch(error => {
  console.error(`Publish failed: ${error.message}`);
  process.exitCode = 1;
});
