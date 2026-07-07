'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const bookingHandler = require('../api/bookings');
const loginHandler = require('../api/staff/login');
const staffHandler = require('../api/staff/bookings');

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.STAFF_PASSWORD = 'correct-horse-battery-staple';
process.env.SESSION_SECRET = 'this-is-a-test-secret-longer-than-thirty-two-characters';
process.env.NODE_ENV = 'test';

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function loginCookie() {
  const res = response();
  await loginHandler({ method: 'POST', headers: {}, body: { password: process.env.STAFF_PASSWORD } }, res);
  assert.equal(res.statusCode, 200);
  return res.headers['set-cookie'].split(';')[0];
}

test('customer API rejects invalid booking without contacting Supabase', async () => {
  let contacted = false;
  global.fetch = async () => { contacted = true; };
  const res = response();
  await bookingHandler({ method: 'POST', headers: {}, body: { customerName: '' } }, res);
  assert.equal(res.statusCode, 422);
  assert.equal(contacted, false);
});

test('customer API stores a valid booking and returns a public ID', async () => {
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response('', { status: 201 });
  };
  const res = response();
  await bookingHandler({
    method: 'POST', headers: {}, body: {
      customerName: 'Arjun Rao', phone: '+91 99887 76655', bookingDate: '2099-12-31', bookingTime: '20:00', guests: '2', specialRequest: ''
    }
  }, res);
  assert.equal(res.statusCode, 201);
  assert.match(res.body.bookingId, /^BK-20991231-[A-F0-9]{8}$/);
  assert.match(request.url, /\/rest\/v1\/bookings$/);
  assert.equal(JSON.parse(request.options.body).status, 'Pending');
  assert.equal(request.options.headers.apikey, 'test-service-key');
});

test('staff endpoint rejects requests without a valid session', async () => {
  const res = response();
  await staffHandler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('staff login creates an HttpOnly SameSite session and permits listing', async () => {
  const cookie = await loginCookie();
  assert.match(cookie, /^restaurant_staff_session=/);

  global.fetch = async () => new Response(JSON.stringify([{ booking_id: 'BK-20991231-ABCDEF12' }]), { status: 200 });
  const res = response();
  await staffHandler({ method: 'GET', headers: { cookie } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.bookings.length, 1);
});

test('staff status updates accept only known statuses', async () => {
  const cookie = await loginCookie();
  const res = response();
  await staffHandler({ method: 'PATCH', headers: { cookie }, body: { bookingId: 'BK-20991231-ABCDEF12', status: 'Seated' } }, res);
  assert.equal(res.statusCode, 400);
});
