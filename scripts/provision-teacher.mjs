/** Admin-only account provisioning. Password is read from stdin, never saved or logged. */
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline/promises';
const project = 'local-history-geography';
const database = `https://${project}-default-rtdb.asia-southeast1.firebasedatabase.app`;
const username = process.argv[2]?.trim().toLowerCase();
if (!username || !/^[a-z0-9][a-z0-9._-]{1,39}$/.test(username)) {
  throw new Error('Usage: node scripts/provision-teacher.mjs <username> (password supplied on stdin)');
}
const input = createInterface({ input: process.stdin });
const password = await new Promise(resolve => input.once('line', resolve));
input.close();
if (typeof password !== 'string' || password.length < 6) throw new Error('Password must contain at least 6 characters.');
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const scopes = require('firebase-tools/lib/scopes.js');
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Sign in with firebase login first.');
const tokens = await auth.getAccessToken(account.tokens.refresh_token,
  [scopes.EMAIL, scopes.OPENID, scopes.CLOUD_PROJECTS_READONLY, scopes.FIREBASE_PLATFORM, scopes.CLOUD_PLATFORM]);
const headers = { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' };
async function request(url, body, method = 'POST') {
  const response = await fetch(url, { method, headers, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Firebase request failed (${response.status}): ${data.error?.message ?? 'unknown error'}`);
  return data;
}
const email = `${username}@teachers.local-history-geography.app`;
const existing = await request(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:query`,
  { expression: [{ email }], limit: '1' });
if (existing.userInfo?.length) throw new Error('This teacher account already exists; no password or permission was changed.');
const user = await request('https://identitytoolkit.googleapis.com/v1/accounts:signUp',
  { targetProjectId: project, email, password, displayName: username });
if (!user.localId) throw new Error('Firebase did not return an account UID.');
await request(`${database}/teachers/${encodeURIComponent(user.localId)}.json`, true, 'PUT');
console.log(JSON.stringify({ username, uid: user.localId, teacherApproved: true }));
