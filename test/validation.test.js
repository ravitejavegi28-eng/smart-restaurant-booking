'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBooking } = require('../api/_lib/validation');

const valid = {
  customerName: 'Priya Sharma',
  phone: '+91 98765 43210',
  bookingDate: '2030-06-20',
  bookingTime: '19:30',
  guests: '4',
  specialRequest: 'Window table, please'
};

test('accepts a complete future booking', () => {
  const result = validateBooking(valid, new Date('2030-06-20T10:00:00+05:30'));
  assert.equal(result.valid, true);
  assert.equal(result.data.guests, 4);
  assert.equal(result.data.customer_name, 'Priya Sharma');
});

test('rejects a booking in the past', () => {
  const result = validateBooking(valid, new Date('2030-06-20T20:00:00+05:30'));
  assert.equal(result.valid, false);
  assert.match(result.errors.bookingDate, /future/i);
});

test('enforces restaurant hours', () => {
  const result = validateBooking({ ...valid, bookingTime: '09:59' }, new Date('2030-01-01T00:00:00Z'));
  assert.equal(result.valid, false);
  assert.match(result.errors.bookingTime, /10:00 AM/);
});

test('validates required customer details and guest limit', () => {
  const result = validateBooking({ ...valid, customerName: '', phone: '123', guests: 21 });
  assert.equal(result.valid, false);
  assert.ok(result.errors.customerName);
  assert.ok(result.errors.phone);
  assert.ok(result.errors.guests);
});
