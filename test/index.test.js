const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('sqlite3', () => {
  const mockDb = {
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn(),
    each: jest.fn(),
    close: jest.fn(),
  };
  return {
    verbose: () => ({
      Database: jest.fn((_path, _mode, cb) => {
        if (cb) process.nextTick(() => cb(null));
        return mockDb;
      }),
    }),
    OPEN_READWRITE: 2,
    __mockDb: mockDb,
  };
});

jest.mock('../sitemap', () => ({ generateSitemap: jest.fn() }));
jest.mock('sharp', () => jest.fn(() => ({ metadata: jest.fn().mockResolvedValue({}) })));
jest.mock('sharp-phash', () => jest.fn().mockResolvedValue('hash'));
jest.mock('sharp-phash/distance', () => jest.fn().mockReturnValue(10));
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue(Buffer.from('')),
  readdir:  jest.fn().mockResolvedValue([]),
  unlink:   jest.fn().mockResolvedValue(undefined),
}));

const sqlite3 = require('sqlite3');
const mockDb = sqlite3.__mockDb;
const app = require('../index');

beforeEach(() => jest.clearAllMocks());


// ─── 1. POST /login ──────────────────────────────────────────────────────────
describe('POST /login', () => {

  test('returns role when email and password are correct', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    mockDb.get.mockImplementation((_sql, _params, cb) => {
      cb(null, { password: hashed, role: 'participant' });
    });

    const res = await request(app)
      .post('/login')
      .send({ email: 'user@test.com', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.type).toBe('participant');
  });

  test('returns 401 when password is wrong', async () => {
    const hashed = await bcrypt.hash('correctpass', 10);
    mockDb.get.mockImplementation((_sql, _params, cb) => {
      cb(null, { password: hashed, role: 'participant' });
    });

    const res = await request(app)
      .post('/login')
      .send({ email: 'user@test.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/incorrect password/i);
  });

  test('returns 401 when email is not registered', async () => {
    mockDb.get.mockImplementation((_sql, _params, cb) => {
      cb(null, undefined);
    });

    const res = await request(app)
      .post('/login')
      .send({ email: 'ghost@test.com', password: 'anything' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/no user with that email/i);
  });

});


// ─── 2. POST /signUp ─────────────────────────────────────────────────────────
describe('POST /signUp', () => {

  test('creates a new user and returns 201', async () => {
    mockDb.get.mockImplementationOnce((_sql, _params, cb) => cb(null, undefined));
    mockDb.run.mockImplementationOnce(function (_sql, _params, cb) { cb(null); });

    const res = await request(app)
      .post('/signUp')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'secure123' });

    expect(res.statusCode).toBe(201);
  });

  test('returns 401 when email is already registered', async () => {
    mockDb.get.mockImplementationOnce((_sql, _params, cb) => {
      cb(null, { email: 'alice@test.com' });
    });

    const res = await request(app)
      .post('/signUp')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'secure123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/already with this email/i);
  });

  test('returns 500 when the database INSERT fails', async () => {
    mockDb.get.mockImplementationOnce((_sql, _params, cb) => cb(null, undefined));
    mockDb.run.mockImplementationOnce(function (_sql, _params, cb) {
      cb(new Error('insert failed'));
    });

    const res = await request(app)
      .post('/signUp')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'secure123' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/failed to create user/i);
  });

});


// ─── 3. POST /setSession ─────────────────────────────────────────────────────
describe('POST /setSession', () => {

  test('sets session and responds when user is found', async () => {
    mockDb.get.mockImplementation((_sql, _params, cb) => {
      cb(null, { role: 'participant' });
    });

    const res = await request(app)
      .post('/setSession')
      .send({ email: 'user@test.com' });

    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Session data set');
  });

  test('returns 500 when database fails during setSession', async () => {
    mockDb.get.mockImplementation((_sql, _params, cb) => {
      cb(new Error('DB error'), null);
    });

    const res = await request(app)
      .post('/setSession')
      .send({ email: 'user@test.com' });

    expect(res.statusCode).toBe(500);
  });

});


// ─── 4. GET /getSession ──────────────────────────────────────────────────────
describe('GET /getSession', () => {

  test('responds with 200', async () => {
    const res = await request(app).get('/getSession');
    expect(res.statusCode).toBe(200);
  });

});


// ─── 5. POST /destroySession ─────────────────────────────────────────────────
describe('POST /destroySession', () => {

  test('destroys session and returns confirmation message', async () => {
    const res = await request(app).post('/destroySession');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Session destroyed');
  });

});


// ─── 6. GET /updateTotal ─────────────────────────────────────────────────────
describe('GET /updateTotal', () => {

  test('returns total CO2 saved as a number', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { total: 42.5 });
    });

    const res = await request(app).get('/updateTotal');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(typeof res.body.total).toBe('number');
  });

  test('returns 0 when no actions have been logged', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { total: null });
    });

    const res = await request(app).get('/updateTotal');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(0);
  });

});


// ─── 7. GET /updatePoints ────────────────────────────────────────────────────
describe('GET /updatePoints', () => {

  test('returns total points as a number', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { total: 150 });
    });

    const res = await request(app).get('/updatePoints');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(150);
  });

  test('returns 0 when no points have been awarded', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { total: null });
    });

    const res = await request(app).get('/updatePoints');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(0);
  });

});


// ─── 8. GET /getMembers ──────────────────────────────────────────────────────
describe('GET /getMembers', () => {

  test('returns the total number of members', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { members: 7 });
    });

    const res = await request(app).get('/getMembers');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(7);
  });

  test('returns 0 when there are no members', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { members: 0 });
    });

    const res = await request(app).get('/getMembers');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(0);
  });

});


// ─── 9. POST /delete ─────────────────────────────────────────────────────────
describe('POST /delete', () => {

  test('returns 200 and confirmation message when account is deleted', async () => {
    mockDb.get.mockImplementation((_sql, _params, cb) =>
      cb(null, { user_id: 1 })
    );
    mockDb.each.mockImplementation(() => {});
    mockDb.run.mockImplementation(function (_sql, _params, cb) {
      if (cb) cb(null);
    });

    const res = await request(app).post('/delete');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/account deleted/i);
  });

  test('returns 400 when the session user does not exist', async () => {
    mockDb.get.mockImplementation((_sql, _params, cb) =>
      cb(null, undefined)
    );

    const res = await request(app).post('/delete');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/no user found/i);
  });

});


// ─── 10. GET /updateLeaderboard ──────────────────────────────────────────────
describe('GET /updateLeaderboard', () => {

  test('returns parallel name/total arrays', async () => {
    mockDb.all.mockImplementation((_sql, cb) => {
      cb(null, [
        { name: 'Team Alpha', total: 300 },
        { name: 'Team Beta',  total: 150 },
      ]);
    });

    const res = await request(app).get('/updateLeaderboard');

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toEqual(['Team Alpha', 'Team Beta']);
    expect(res.body.total).toEqual([300, 150]);
  });

  test('coerces null totals to 0', async () => {
    mockDb.all.mockImplementation((_sql, cb) =>
      cb(null, [{ name: 'Empty Group', total: null }])
    );

    const res = await request(app).get('/updateLeaderboard');

    expect(res.statusCode).toBe(200);
    expect(res.body.total[0]).toBe(0);
  });

  test('returns empty arrays when no groups exist', async () => {
    mockDb.all.mockImplementation((_sql, cb) => cb(null, []));

    const res = await request(app).get('/updateLeaderboard');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ name: [], total: [] });
  });

  test('returns 500 when the database query fails', async () => {
    mockDb.all.mockImplementation((_sql, cb) =>
      cb(new Error('DB error'), null)
    );

    const res = await request(app).get('/updateLeaderboard');

    expect(res.statusCode).toBe(500);
  });

});


// ─── 11. POST /approveDeny ───────────────────────────────────────────────────
describe('POST /approveDeny', () => {

  test('approve: inserts decision, fetches score, updates submission', async () => {
    let callCount = 0;
    mockDb.get.mockImplementation((_sql, _params, cb) => {
      callCount++;
      if (callCount === 1) cb(null, { user_id: 5 });
      else                 cb(null, { score: 50 });
    });
    mockDb.run.mockImplementation(function (_sql, _params, cb) {
      if (cb) cb(null);
    });

    const res = await request(app)
      .post('/approveDeny')
      .send({ id: 1, outcome: 'approve', reason: 'Great work' });

    expect(res.statusCode).toBe(200);
  });

  test('deny: inserts decision and updates status to Denied', async () => {
    mockDb.get.mockImplementation((_sql, _params, cb) =>
      cb(null, { user_id: 5 })
    );
    mockDb.run.mockImplementation(function (_sql, _params, cb) {
      if (cb) cb(null);
    });

    const res = await request(app)
      .post('/approveDeny')
      .send({ id: 1, outcome: 'deny', reason: 'Invalid evidence' });

    expect(res.statusCode).toBe(200);
  });

  test('returns 500 when INSERT into ModerationDecisions fails', async () => {
    mockDb.get.mockImplementation((_sql, _params, cb) =>
      cb(null, { user_id: 5 })
    );
    mockDb.run.mockImplementation(function (_sql, _params, cb) {
      cb(new Error('insert failed'));
    });

    const res = await request(app)
      .post('/approveDeny')
      .send({ id: 1, outcome: 'deny', reason: 'Bad submission' });

    expect(res.statusCode).toBe(500);
  });

});


// ─── 12. GET /updateChallengeList ────────────────────────────────────────────
describe('GET /updateChallengeList', () => {

  test('returns parallel arrays of active challenges', async () => {
    mockDb.all.mockImplementation((_sql, _params, cb) => {
      cb(null, [
        { title: 'Go Vegan',      end_date: '2026-12-01', evidence_required: 1 },
        { title: 'Cycle to Work', end_date: '2026-11-01', evidence_required: 0 },
      ]);
    });

    const res = await request(app).get('/updateChallengeList');

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toEqual(['Go Vegan', 'Cycle to Work']);
    expect(res.body.date).toEqual(['2026-12-01', '2026-11-01']);
    expect(res.body.evidence).toEqual([1, 0]);
  });

  test('returns empty array when no active challenges exist', async () => {
    mockDb.all.mockImplementation((_sql, _params, cb) => cb(null, []));

    const res = await request(app).get('/updateChallengeList');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ challenges: [] });
  });

  test('returns 500 when the database query fails', async () => {
    mockDb.all.mockImplementation((_sql, _params, cb) =>
      cb(new Error('DB error'), null)
    );

    const res = await request(app).get('/updateChallengeList');

    expect(res.statusCode).toBe(500);
  });

});


// ─── 13. POST /addChallenge ──────────────────────────────────────────────────
describe('POST /addChallenge', () => {

  const validChallenge = {
    name: 'New Challenge', scope: 'global', rules: 'Do the thing',
    points: 100, start: '2026-01-01', end: '2026-06-01', selectedValue: 1,
  };

  test('creates a challenge and returns 201', async () => {
    mockDb.run.mockImplementation(function (_sql, _params, cb) { cb(null); });

    const res = await request(app).post('/addChallenge').send(validChallenge);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/challenge created/i);
  });

  test('returns 500 when the database INSERT fails', async () => {
    mockDb.run.mockImplementation(function (_sql, _params, cb) {
      cb(new Error('insert failed'));
    });

    const res = await request(app).post('/addChallenge').send(validChallenge);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/failed to create challenge/i);
  });

});


// ─── 14. POST /deleteChallenge ───────────────────────────────────────────────
describe('POST /deleteChallenge', () => {

  test('returns 200 and confirmation message', async () => {
    mockDb.each.mockImplementation(() => {});
    mockDb.run.mockImplementation(function (_sql, _params, cb) {
      if (cb) cb(null);
    });

    const res = await request(app).post('/deleteChallenge').send({ id: 7 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/challenge deleted/i);
  });

});


// ─── 15. GET /updateCarbon ───────────────────────────────────────────────────
describe('GET /updateCarbon', () => {

  test('returns total carbon saved as a number', async () => {
    mockDb.get.mockImplementation((_sql, cb) =>
      cb(null, { total: 88.4 })
    );

    const res = await request(app).get('/updateCarbon');

    expect(res.statusCode).toBe(200);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.total).toBe(88.4);
  });

  test('returns 0 when no carbon has been saved', async () => {
    mockDb.get.mockImplementation((_sql, cb) =>
      cb(null, { total: null })
    );

    const res = await request(app).get('/updateCarbon');

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(0);
  });

});


// ─── 16. GET /updateSubmissionsList ──────────────────────────────────────────
describe('GET /updateSubmissionsList', () => {

  test('returns parallel arrays with flag messages correctly mapped', async () => {
    mockDb.all.mockImplementation((_sql, _params, cb) => {
      cb(null, [
        { name: 'Cycle to work', submission_id: 1, evidence: 'img1.png', title: 'Cycle Challenge', flags: null },
        { name: 'Go vegan',      submission_id: 2, evidence: 'img2.png', title: 'Diet Challenge',  flags: 'Rule 1: Corrupted File' },
      ]);
    });

    const res = await request(app).get('/updateSubmissionsList');

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toEqual(['Cycle to work', 'Go vegan']);
    expect(res.body.id).toEqual([1, 2]);
    expect(res.body.challenge_title).toEqual(['Cycle Challenge', 'Diet Challenge']);
    expect(res.body.flag[0]).toBe('No automatic flags triggered');
    expect(res.body.flag[1]).toBe('Rule 1: Corrupted File');
  });

  test('returns empty arrays when there are no pending submissions', async () => {
    mockDb.all.mockImplementation((_sql, _params, cb) => cb(null, []));

    const res = await request(app).get('/updateSubmissionsList');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ title: [], id: [], evidence: [], challenge_title: [], flag: [] });
  });

  test('returns 500 when the database query fails', async () => {
    mockDb.all.mockImplementation((_sql, _params, cb) =>
      cb(new Error('DB error'), null)
    );

    const res = await request(app).get('/updateSubmissionsList');

    expect(res.statusCode).toBe(500);
  });

});