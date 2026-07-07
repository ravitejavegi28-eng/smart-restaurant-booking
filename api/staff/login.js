'use strict';

const { sendJson, methodNotAllowed, getBody } = require('../_lib/http');
const { createSession, passwordMatches, sessionCookie, clearCookie, isAuthenticated } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return sendJson(res, 200, { authenticated: isAuthenticated(req) });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearCookie(process.env.NODE_ENV === 'production'));
    return sendJson(res, 200, { authenticated: false });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);

  const body = getBody(req);
  if (!body || !passwordMatches(body.password)) {
    return sendJson(res, 401, { error: 'Incorrect password.' });
  }

  try {
    res.setHeader('Set-Cookie', sessionCookie(createSession(), process.env.NODE_ENV === 'production'));
    return sendJson(res, 200, { authenticated: true });
  } catch (error) {
    console.error('Login configuration error', error.message);
    return sendJson(res, 500, { error: 'Staff login is temporarily unavailable.' });
  }
};
