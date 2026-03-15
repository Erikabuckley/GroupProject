const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mock sqlite3 
// IMPORTANT: process.nextTick delays the callback so `const db` is assigned
// before the callback tries to use it — without this you get
// "Cannot access 'db' before initialization"
jest.mock('sqlite3', () => {
  const mockDb = {
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn(),
    each: jest.fn(),
  };
  return {
    verbose: () => ({
      Database: jest.fn((_path, _mode, cb) => {
        if (cb) process.nextTick(() => cb(null)); // async so db is assigned first
        return mockDb;
      }),
    }),
    OPEN_READWRITE: 2,
    __mockDb: mockDb,
  };
});

// Mock sitemap 
jest.mock('../sitemap', () => ({ generateSitemap: jest.fn() }));

// Mock sharp/phash
jest.mock('sharp', () => jest.fn(() => ({ metadata: jest.fn().mockResolvedValue({}) })));
jest.mock('sharp-phash', () => jest.fn().mockResolvedValue('hash'));
jest.mock('sharp-phash/distance', () => jest.fn().mockReturnValue(10));

// Shared mockDb and app 
const sqlite3 = require('sqlite3');
const mockDb = sqlite3.__mockDb;
const app = require('../index');

beforeEach(() => jest.clearAllMocks());


//1. POST /login
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


// 2. POST /signUp
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


// 3. POST /setSession
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


// 4. GET /getSession 
describe('GET /getSession', () => {

  // Session is empty in tests so values are undefined — JSON strips undefined
  // keys, so we just confirm the route responds successfully
  test('responds with 200', async () => {
    const res = await request(app).get('/getSession');
    expect(res.statusCode).toBe(200);
  });

});


// 5. POST /destroySession 
describe('POST /destroySession', () => {

  test('destroys session and returns confirmation message', async () => {
    const res = await request(app).post('/destroySession');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Session destroyed');
  });

});


// 6. GET /updateTotal
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


// 7. GET /updatePoints 
describe('GET /updatePoints', () => {

  test('returns total points as a number', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { total: 150 });
    });

    const res = await request(app).get('/updatePoints');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total');
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


// 8. GET /getMembers 
describe('GET /getMembers', () => {

  test('returns the total number of members', async () => {
    mockDb.get.mockImplementation((_sql, cb) => {
      cb(null, { members: 7 });
    });

    const res = await request(app).get('/getMembers');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total');
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