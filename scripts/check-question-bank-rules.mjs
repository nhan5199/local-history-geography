/** Local emulator regression checks; never connects to production Firebase. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const namespace = 'local-history-geography-default-rtdb';
const database = `http://127.0.0.1:9000?ns=${namespace}`;
const prefix = `rule-${crypto.randomUUID()}`;
const tracked = [];
let passed = 0;

async function request(path, { method = 'GET', body, token, owner = false } = {}) {
  const url = new URL(database);
  url.pathname = `${path}.json`;
  if (token) url.searchParams.set('auth', token);
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(owner ? { Authorization: 'Bearer owner' } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, data: await response.json() };
}

async function account(suffix) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${prefix}-${suffix}@example.test`, password: 'emulator-test-only', returnSecureToken: true }),
  });
  assert.equal(response.status, 200, 'Emulator account creation');
  return response.json();
}

function check(label, actual, expected) {
  assert.equal(actual, expected, label);
  passed++;
}

try {
  // Loading the committed production rules also verifies their syntax.
  const rules = JSON.parse(await readFile('firebase/database.rules.json', 'utf8'));
  check('Production rules compile', (await request('/.settings/rules', { method: 'PUT', body: rules, owner: true })).status, 200);
  const teacher = await account('teacher');
  const student = await account('student');
  const rolePath = `/teachers/${teacher.localId}`;
  tracked.push(rolePath);
  await request(rolePath, { method: 'PUT', body: true, owner: true });
  const make = (id, overrides = {}) => ({
    id, type: 'single', prompt: 'Câu hỏi thử nghiệm', options: ['A', 'B'], answers: ['A'], explanation: '',
    difficulty: 1, mode: 'questions', createdAt: Date.now(), createdBy: teacher.localId, ...overrides,
  });
  const path = `/questionBank/questions/${prefix}`;
  tracked.push(path);
  const question = make(prefix);
  check('Anonymous create denied', (await request(path, { method: 'PUT', body: question })).status, 401);
  check('Nonteacher create denied', (await request(path, { method: 'PUT', body: question, token: student.idToken })).status, 401);
  check('Teacher create accepted', (await request(path, { method: 'PUT', body: question, token: teacher.idToken })).status, 200);
  check('Bank question immutable', (await request(path, { method: 'PUT', body: { ...question, prompt: 'Changed' }, token: teacher.idToken })).status, 401);
  check('Teacher delete denied', (await request(path, { method: 'DELETE', token: teacher.idToken })).status, 401);
  check('Public bank record denied', (await request(path)).status, 401);
  check('Nonteacher bank record denied', (await request(path, { token: student.idToken })).status, 401);
  check('Unbounded bank query denied', (await request('/questionBank/questions', { token: teacher.idToken })).status, 401);

  const query = new URL(`${database}&orderBy=%22createdAt%22&limitToFirst=25&auth=${encodeURIComponent(teacher.idToken)}`);
  query.pathname = '/questionBank/questions.json';
  check('Indexed bounded teacher query accepted', (await fetch(query)).status, 200);
  query.searchParams.delete('auth');
  check('Public bounded bank query denied', (await fetch(query)).status, 401);

  for (const difficulty of [0, 6, 1.5, '1']) {
    const id = `${prefix}-difficulty-${String(difficulty).replace('.', '-')}`;
    const invalidPath = `/questionBank/questions/${id}`;
    tracked.push(invalidPath);
    check(`Invalid difficulty ${difficulty} denied`, (await request(invalidPath, {
      method: 'PUT', body: make(id, { difficulty }), token: teacher.idToken,
    })).status, 401);
  }
  const badId = `${prefix}-wrong-mode`;
  tracked.push(`/questionBank/questions/${badId}`);
  check('Game-only type rejected in test bank', (await request(`/questionBank/questions/${badId}`, {
    method: 'PUT', body: make(badId, { type: 'fill', options: null }), token: teacher.idToken,
  })).status, 401);

  const gameId = `${prefix}-game-fill`;
  const gamePath = `/questionBank/game/${gameId}`;
  tracked.push(gamePath);
  check('Game fill with absent options accepted', (await request(gamePath, {
    method: 'PUT', body: make(gameId, { type: 'fill', mode: 'game', options: null, answers: ['Đông'], difficulty: 5 }), token: teacher.idToken,
  })).status, 200);

  // If a test write fails, its companion bank question must not be committed.
  const atomicId = `${prefix}-atomic`;
  const atomicPath = `/questionBank/questions/${atomicId}`;
  tracked.push(atomicPath);
  const { mode, createdAt, createdBy, ...testQuestion } = make(atomicId);
  const denied = await request('/', { method: 'PATCH', token: teacher.idToken, body: {
    [`questionBank/questions/${atomicId}`]: make(atomicId),
    'questionSets/invalid-slot': { id: 'invalid-slot', title: 'Invalid test', mode, createdAt, createdBy, published: true, questions: [testQuestion] },
  } });
  check('Combined invalid test import denied', denied.status, 401);
  check('Atomic failure leaves no bank question', (await request(atomicPath, { owner: true })).data, null);

  const occupied = await request('/questionSets', { owner: true });
  const freeId = Array.from({ length: 30 }, (_, index) => `questions-${index}`)
    .find(id => !occupied.data?.[id]);
  assert.ok(freeId, 'Emulator has a free test slot');
  tracked.push(`/questionSets/${freeId}`);
  const committed = await request('/', { method: 'PATCH', token: teacher.idToken, body: {
    [`questionBank/questions/${atomicId}`]: make(atomicId),
    [`questionSets/${freeId}`]: { id: freeId, title: 'Atomic test', mode, createdAt, createdBy, published: true, questions: [testQuestion] },
  } });
  check('Combined bank and test import accepted', committed.status, 200);
  check('Bank persists after test creation', (await request(atomicPath, { owner: true })).data.id, atomicId);
  check('Published test carries difficulty', (await request(`/questionSets/${freeId}`, { owner: true })).data.questions[0].difficulty, 1);
  console.log(JSON.stringify({ emulatorOnly: true, checksPassed: passed }));
} finally {
  for (const path of tracked) await request(path, { method: 'DELETE', owner: true });
}
