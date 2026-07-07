'use strict';

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,79}$/u;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,19}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateBooking(input, now = new Date()) {
  const data = {
    customer_name: clean(input?.customerName),
    phone: clean(input?.phone),
    booking_date: clean(input?.bookingDate),
    booking_time: clean(input?.bookingTime),
    guests: Number(input?.guests),
    special_request: clean(input?.specialRequest)
  };
  const errors = {};

  if (!NAME_PATTERN.test(data.customer_name)) errors.customerName = 'Enter a valid name (2–80 characters).';
  if (!PHONE_PATTERN.test(data.phone)) errors.phone = 'Enter a valid phone number.';
  if (!DATE_PATTERN.test(data.booking_date)) errors.bookingDate = 'Choose a valid booking date.';
  if (!TIME_PATTERN.test(data.booking_time)) errors.bookingTime = 'Choose a valid booking time.';
  if (!Number.isInteger(data.guests) || data.guests < 1 || data.guests > 20) errors.guests = 'Guests must be between 1 and 20.';
  if (data.special_request.length > 500) errors.specialRequest = 'Special request must be 500 characters or fewer.';

  if (!errors.bookingTime && (data.booking_time < '10:00' || data.booking_time > '23:59')) {
    errors.bookingTime = 'Bookings are available from 10:00 AM to 11:59 PM.';
  }

  if (!errors.bookingDate && !errors.bookingTime) {
    const booking = new Date(`${data.booking_date}T${data.booking_time}:00+05:30`);
    if (Number.isNaN(booking.getTime()) || booking <= now) {
      errors.bookingDate = 'Booking must be for a future date and time.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors, data };
}

module.exports = { validateBooking };
