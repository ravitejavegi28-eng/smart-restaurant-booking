'use strict';

const loginView = document.querySelector('#login-view');
const dashboardView = document.querySelector('#dashboard-view');
const loginForm = document.querySelector('#login-form');
const loginAlert = document.querySelector('#login-alert');
const dashboardAlert = document.querySelector('#dashboard-alert');
const tableBody = document.querySelector('#booking-table-body');
const mobileCards = document.querySelector('#mobile-cards');
const loadingState = document.querySelector('#loading-state');
const emptyState = document.querySelector('#empty-state');
const desktopTable = document.querySelector('#desktop-table');
const deleteDialog = document.querySelector('#delete-dialog');

let bookings = [];
let activeFilter = 'today';
let bookingToDelete = null;

function localDate(offset = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const base = new Date(`${values.year}-${values.month}-${values.day}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function formatTime(time) {
  const [hour, minute] = time.split(':').map(Number);
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute));
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 && url !== '/api/staff/login') showLogin();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function setLoading(button, loading, text) {
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  const label = button.querySelector('.button-label');
  if (label && text) label.textContent = text;
}

function showLogin() {
  dashboardView.hidden = true;
  loginView.hidden = false;
  loginForm.reset();
  document.querySelector('#staff-password').focus();
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  loadBookings();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginAlert.hidden = true;
  const button = loginForm.querySelector('button[type="submit"]');
  const password = loginForm.elements.password.value;
  if (!password) {
    loginAlert.textContent = 'Enter the staff password.';
    loginAlert.hidden = false;
    return;
  }
  setLoading(button, true, 'Signing in…');
  try {
    await api('/api/staff/login', { method: 'POST', body: JSON.stringify({ password }) });
    loginForm.reset();
    showDashboard();
  } catch (error) {
    loginAlert.textContent = error.message;
    loginAlert.hidden = false;
  } finally {
    setLoading(button, false, 'Open dashboard');
  }
});

document.querySelector('#toggle-password').addEventListener('click', (event) => {
  const input = document.querySelector('#staff-password');
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  event.currentTarget.textContent = reveal ? 'Hide' : 'Show';
  event.currentTarget.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
});

async function loadBookings() {
  loadingState.hidden = false;
  emptyState.hidden = true;
  desktopTable.hidden = true;
  mobileCards.hidden = true;
  dashboardAlert.hidden = true;
  const refresh = document.querySelector('#refresh-button');
  refresh.disabled = true;
  try {
    const result = await api('/api/staff/bookings');
    bookings = result.bookings;
    updateStats();
    renderBookings();
  } catch (error) {
    dashboardAlert.textContent = error.message;
    dashboardAlert.hidden = false;
  } finally {
    loadingState.hidden = true;
    refresh.disabled = false;
  }
}

function updateStats() {
  const today = localDate();
  const now = new Date();
  const timeParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  document.querySelector('#total-count').textContent = bookings.length;
  document.querySelector('#today-count').textContent = bookings.filter((booking) => booking.booking_date === today).length;
  document.querySelector('#upcoming-count').textContent = bookings.filter((booking) => booking.status !== 'Cancelled' && (booking.booking_date > today || (booking.booking_date === today && booking.booking_time > timeParts))).length;
}

function filteredBookings() {
  const dates = { yesterday: localDate(-1), today: localDate(), tomorrow: localDate(1) };
  const query = document.querySelector('#booking-search').value.trim().toLowerCase();
  return bookings.filter((booking) => {
    const dateMatch = activeFilter === 'all' || booking.booking_date === dates[activeFilter];
    const haystack = `${booking.customer_name} ${booking.phone} ${booking.booking_id}`.toLowerCase();
    return dateMatch && (!query || haystack.includes(query));
  });
}

function statusOptions(selected) {
  return ['Pending', 'Confirmed', 'Cancelled'].map((status) => `<option value="${status}"${selected === status ? ' selected' : ''}>${status}</option>`).join('');
}

function renderBookings() {
  const visible = filteredBookings();
  const labels = { today: 'Today’s bookings', tomorrow: 'Tomorrow’s bookings', yesterday: 'Yesterday’s bookings', all: 'All bookings' };
  document.querySelector('#booking-list-title').textContent = labels[activeFilter];
  document.querySelector('#result-count').textContent = `${visible.length} booking${visible.length === 1 ? '' : 's'}`;
  tableBody.replaceChildren();
  mobileCards.replaceChildren();

  if (!visible.length) {
    emptyState.hidden = false;
    desktopTable.hidden = true;
    mobileCards.hidden = true;
    return;
  }

  emptyState.hidden = true;
  desktopTable.hidden = false;
  mobileCards.hidden = false;
  visible.forEach((booking) => {
    const request = booking.special_request || '—';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><div class="guest-cell"><strong>${escapeHtml(booking.customer_name)}</strong><span>${escapeHtml(booking.phone)}</span></div></td>
      <td><div class="booking-cell"><strong>${escapeHtml(booking.booking_id)}</strong><span>${formatDate(booking.booking_date)} · ${formatTime(booking.booking_time)}</span></div></td>
      <td>${booking.guests}</td><td class="request-cell" title="${escapeHtml(request)}">${escapeHtml(request)}</td>
      <td><select class="status-select status-${booking.status}" data-booking-id="${booking.booking_id}" aria-label="Status for ${escapeHtml(booking.customer_name)}">${statusOptions(booking.status)}</select></td>
      <td><button class="delete-button" type="button" data-delete-id="${booking.booking_id}" aria-label="Delete booking ${booking.booking_id}">⌫</button></td>`;
    tableBody.append(row);

    const card = document.createElement('article');
    card.className = 'booking-card';
    card.innerHTML = `
      <div class="booking-card-head"><div><strong>${escapeHtml(booking.customer_name)}</strong><span>${escapeHtml(booking.phone)}</span></div><span>${booking.guests} guest${booking.guests === 1 ? '' : 's'}</span></div>
      <div class="booking-card-row"><span><strong>${formatDate(booking.booking_date)}</strong><br>${formatTime(booking.booking_time)}</span><span>${escapeHtml(booking.booking_id)}</span></div>
      <p class="booking-card-request"><strong>Request:</strong> ${escapeHtml(request)}</p>
      <div class="booking-card-actions"><select class="status-select status-${booking.status}" data-booking-id="${booking.booking_id}" aria-label="Status for ${escapeHtml(booking.customer_name)}">${statusOptions(booking.status)}</select><button class="delete-button" type="button" data-delete-id="${booking.booking_id}" aria-label="Delete booking ${booking.booking_id}">⌫</button></div>`;
    mobileCards.append(card);
  });

  document.querySelectorAll('.status-select').forEach((select) => select.addEventListener('change', updateStatus));
  document.querySelectorAll('[data-delete-id]').forEach((button) => button.addEventListener('click', openDeleteDialog));
}

async function updateStatus(event) {
  const select = event.currentTarget;
  const booking = bookings.find((item) => item.booking_id === select.dataset.bookingId);
  const previous = booking.status;
  select.disabled = true;
  try {
    await api('/api/staff/bookings', { method: 'PATCH', body: JSON.stringify({ bookingId: booking.booking_id, status: select.value }) });
    booking.status = select.value;
    updateStats();
    renderBookings();
  } catch (error) {
    select.value = previous;
    dashboardAlert.textContent = error.message;
    dashboardAlert.hidden = false;
  } finally {
    select.disabled = false;
  }
}

function openDeleteDialog(event) {
  bookingToDelete = event.currentTarget.dataset.deleteId;
  document.querySelector('#delete-booking-id').textContent = bookingToDelete;
  deleteDialog.showModal();
}

deleteDialog.addEventListener('close', async () => {
  if (deleteDialog.returnValue !== 'confirm' || !bookingToDelete) return;
  const id = bookingToDelete;
  bookingToDelete = null;
  try {
    await api('/api/staff/bookings', { method: 'DELETE', body: JSON.stringify({ bookingId: id }) });
    bookings = bookings.filter((booking) => booking.booking_id !== id);
    updateStats();
    renderBookings();
  } catch (error) {
    dashboardAlert.textContent = error.message;
    dashboardAlert.hidden = false;
  }
});

document.querySelectorAll('.filter-tab').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
  renderBookings();
}));

document.querySelector('#booking-search').addEventListener('input', renderBookings);
document.querySelector('#refresh-button').addEventListener('click', loadBookings);
document.querySelector('#logout-button').addEventListener('click', async () => {
  try { await api('/api/staff/login', { method: 'DELETE' }); } catch { /* Session is cleared client-side by returning to login. */ }
  bookings = [];
  showLogin();
});

document.querySelector('#export-button').addEventListener('click', () => {
  const fields = ['booking_id', 'customer_name', 'phone', 'booking_date', 'booking_time', 'guests', 'special_request', 'status', 'created_at'];
  const cell = (value) => {
    let safe = String(value ?? '');
    if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [fields.map(cell).join(','), ...filteredBookings().map((booking) => fields.map((field) => cell(booking[field])).join(','))];
  const blob = new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `saffron-table-bookings-${localDate()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

api('/api/staff/login').then((result) => result.authenticated ? showDashboard() : showLogin()).catch(showLogin);
