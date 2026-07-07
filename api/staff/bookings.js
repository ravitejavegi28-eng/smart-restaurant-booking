'use strict';

const { sendJson, methodNotAllowed, getBody } = require('../_lib/http');
const { isAuthenticated } = require('../_lib/auth');
const { supabaseRequest } = require('../_lib/supabase');

const STATUSES = new Set(['Pending', 'Confirmed', 'Cancelled']);
const BOOKING_ID = /^BK-\d{8}-[A-F0-9]{8}$/;

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return sendJson(res, 401, { error: 'Staff authentication required.' });
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['GET', 'PATCH', 'DELETE']);

  try {
    if (req.method === 'GET') {
      const rows = await supabaseRequest('bookings?select=id,booking_id,customer_name,phone,booking_date,booking_time,guests,special_request,status,created_at&order=booking_date.asc,booking_time.asc');
      return sendJson(res, 200, { bookings: rows || [] });
    }

    const body = getBody(req);
    if (!body || !BOOKING_ID.test(body.bookingId || '')) return sendJson(res, 400, { error: 'Invalid booking ID.' });
    const query = `bookings?booking_id=eq.${encodeURIComponent(body.bookingId)}`;

    if (req.method === 'PATCH') {
      if (!STATUSES.has(body.status)) return sendJson(res, 400, { error: 'Invalid booking status.' });
      await supabaseRequest(query, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: body.status })
      });
      return sendJson(res, 200, { message: 'Booking status updated.' });
    }

    await supabaseRequest(query, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    return sendJson(res, 200, { message: 'Booking deleted.' });
  } catch (error) {
    console.error('Staff bookings error', error.message);
    return sendJson(res, 500, { error: 'The booking service is temporarily unavailable.' });
  }
};
