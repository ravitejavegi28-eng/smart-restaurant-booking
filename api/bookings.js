'use strict';

const crypto = require('node:crypto');
const { sendJson, methodNotAllowed, getBody } = require('./_lib/http');
const { supabaseRequest } = require('./_lib/supabase');
const { validateBooking } = require('./_lib/validation');

function bookingId(date) {
  return `BK-${date.replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);
  const body = getBody(req);
  if (!body) return sendJson(res, 400, { error: 'Invalid JSON request.' });

  const result = validateBooking(body);
  if (!result.valid) return sendJson(res, 422, { error: 'Please correct the highlighted fields.', fields: result.errors });

  const id = bookingId(result.data.booking_date);
  try {
    await supabaseRequest('bookings', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...result.data, booking_id: id, status: 'Pending' })
    });
    return sendJson(res, 201, { message: 'Your table has been reserved.', bookingId: id });
  } catch (error) {
    console.error('Create booking error', error.message);
    return sendJson(res, 500, { error: 'We could not complete your booking. Please try again shortly.' });
  }
};
