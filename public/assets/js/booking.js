'use strict';

const form = document.querySelector('#booking-form');
const successPanel = document.querySelector('#success-panel');
const alertBox = document.querySelector('#form-alert');
const dateInput = document.querySelector('#booking-date');
const timeInput = document.querySelector('#booking-time');
const submitButton = form.querySelector('button[type="submit"]');
const restaurantTimeZone = 'Asia/Kolkata';

function restaurantNowParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: restaurantTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}` };
}

function initializePickers() {
  dateInput.min = restaurantNowParts().date;
  document.querySelectorAll('.picker-field').forEach((field) => {
    field.addEventListener('click', (event) => {
      const input = document.getElementById(field.dataset.picker);
      if (event.target !== input && typeof input.showPicker === 'function') input.showPicker();
    });
  });
}

function setError(name, message = '') {
  const input = form.elements[name];
  if (!input) return;
  const error = document.getElementById(`${input.id}-error`);
  input.closest('.field').classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  if (message) input.setAttribute('aria-describedby', error.id);
  else input.removeAttribute('aria-describedby');
  error.textContent = message;
}

function clearErrors() {
  ['customerName', 'phone', 'bookingDate', 'bookingTime', 'guests', 'specialRequest'].forEach((name) => setError(name));
  alertBox.hidden = true;
}

function validate(values) {
  const errors = {};
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,79}$/u.test(values.customerName.trim())) errors.customerName = 'Enter a valid name (2–80 characters).';
  if (!/^\+?[0-9][0-9 ()-]{6,19}$/.test(values.phone.trim())) errors.phone = 'Enter a valid phone number.';
  if (!values.bookingDate) errors.bookingDate = 'Choose a booking date.';
  if (!values.bookingTime) errors.bookingTime = 'Choose a booking time.';
  else if (values.bookingTime < '10:00' || values.bookingTime > '23:59') errors.bookingTime = 'Choose a time from 10:00 AM to 11:59 PM.';
  if (!values.guests) errors.guests = 'Select the number of guests.';

  if (values.bookingDate && values.bookingTime) {
    const now = restaurantNowParts();
    if (values.bookingDate < now.date || (values.bookingDate === now.date && values.bookingTime <= now.time)) {
      errors.bookingDate = 'Booking must be for a future date and time.';
    }
  }
  return errors;
}

function valuesFromForm() {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

form.addEventListener('input', (event) => {
  if (event.target.name) setError(event.target.name);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors();
  const values = valuesFromForm();
  const errors = validate(values);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([name, message]) => setError(name, message));
    form.elements[Object.keys(errors)[0]].focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.classList.add('is-loading');
  submitButton.querySelector('.button-label').textContent = 'Reserving your table…';

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (result.fields) Object.entries(result.fields).forEach(([name, message]) => setError(name, message));
      throw new Error(result.error || 'Unable to complete the booking.');
    }

    document.querySelector('#success-name').textContent = values.customerName.trim();
    document.querySelector('#booking-id').textContent = result.bookingId;
    form.hidden = true;
    document.querySelector('.form-heading').hidden = true;
    successPanel.hidden = false;
    successPanel.focus({ preventScroll: true });
    successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    alertBox.textContent = error.message || 'Something went wrong. Please try again.';
    alertBox.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('is-loading');
    submitButton.querySelector('.button-label').textContent = 'Reserve my table';
  }
});

document.querySelector('#new-booking').addEventListener('click', () => {
  form.reset();
  clearErrors();
  successPanel.hidden = true;
  document.querySelector('.form-heading').hidden = false;
  form.hidden = false;
  dateInput.min = restaurantNowParts().date;
  form.elements.customerName.focus();
});

initializePickers();
