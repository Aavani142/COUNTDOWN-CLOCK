(() => {
  'use strict';

  const API_URL = '/api/countdowns';

  const categoryLabels = { personal: 'Personal', work: 'Work', travel: 'Travel', celebration: 'Celebration', other: 'Other' };

  const state = {
    filter: 'all',
    category: 'all',
    query: '',
    countdowns: [],
    editingId: null,
    pendingDeleteId: null,
    isSaving: false,
    isDeleting: false,
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    grid: $('grid'),
    loading: $('loading'),
    emptyState: $('emptyState'),
    errorBanner: $('errorBanner'),
    errorText: $('errorText'),
    statTotal: $('statTotal'),
    statActive: $('statActive'),
    statDone: $('statDone'),
    formDialog: $('formDialog'),
    form: $('countdownForm'),
    formTitle: $('formTitle'),
    formError: $('formError'),
    saveBtn: $('saveBtn'),
    titleInput: $('titleInput'),
    dateInput: $('dateInput'),
    timeInput: $('timeInput'),
    descriptionInput: $('descriptionInput'),
    confirmDialog: $('confirmDialog'),
    confirmText: $('confirmText'),
    confirmDeleteBtn: $('confirmDeleteBtn'),
    categoryInput: $('categoryInput'),
    searchInput: $('searchInput'),
    categoryFilter: $('categoryFilter'),
    noResults: $('noResults'),
  };

  /* ---------- API ---------- */

  async function request(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
    } catch (networkError) {
      throw new Error('Cannot reach the server. Check that it is running and try again.');
    }

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      data = null;
    }

    if (!response.ok) {
      const details = data && Array.isArray(data.details) ? data.details.join(' ') : '';
      throw new Error(details || (data && data.error) || `Request failed with status ${response.status}.`);
    }
    return data;
  }

  /* ---------- Helpers ---------- */

  const pad = (n) => String(n).padStart(2, '0');

  function toDateInputValue(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function toTimeInputValue(date) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function formatTarget(timestamp) {
    return new Date(timestamp).toLocaleString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  function getTimeParts(remainingMs) {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  function getProgress(countdown, now) {
    const start = Date.parse(countdown.createdAt);
    const end = Date.parse(countdown.targetDate);
    if (!(end > start)) return 100;
    return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  }

  function sortByTarget(list) {
    return [...list].sort((a, b) =>
      (Number(!!b.pinned) - Number(!!a.pinned)) || (Date.parse(a.targetDate) - Date.parse(b.targetDate)));
  }

  function getVisible() {
    const now = Date.now();
    const q = state.query.trim().toLowerCase();
    return state.countdowns.filter((c) => {
      const done = !!c.completed || Date.parse(c.targetDate) <= now;
      if (state.filter === 'running' && done) return false;
      if (state.filter === 'done' && !done) return false;
      if (state.category !== 'all' && (c.category || 'other') !== state.category) return false;
      return !q || `${c.title} ${c.description || ''}`.toLowerCase().includes(q);
    });
  }

  /* ---------- Error banner ---------- */

  function showError(message) {
    el.errorText.textContent = message;
    el.errorBanner.hidden = false;
  }

  function hideError() {
    el.errorBanner.hidden = true;
    el.errorText.textContent = '';
  }

  /* ---------- Rendering ---------- */

  function cardTemplate(countdown) {
    const category = categoryLabels[countdown.category] ? countdown.category : 'other';
    const canComplete = countdown.completed || Date.parse(countdown.targetDate) > Date.now();
    const description = countdown.description
      ? `<p class="card__desc">${escapeHtml(countdown.description)}</p>`
      : '';
    return `
      <article class="card glass${countdown.pinned ? ' card--pinned' : ''}" data-id="${countdown._id}" data-category="${category}">
        <div class="card__head">
          <div>
            <span class="tag">${categoryLabels[category]}</span>
            <h3 class="card__title">${escapeHtml(countdown.title)}</h3>
          </div>
          <span class="badge" data-role="status">Running</span>
        </div>
        ${description}
        <dl class="time" data-role="time">
          <div class="time__unit"><dt>days</dt><dd data-role="days">0</dd></div>
          <div class="time__unit"><dt>hours</dt><dd data-role="hours">00</dd></div>
          <div class="time__unit"><dt>minutes</dt><dd data-role="minutes">00</dd></div>
          <div class="time__unit"><dt>seconds</dt><dd data-role="seconds">00</dd></div>
        </dl>
        <div>
          <div class="progress" role="progressbar" aria-label="Progress toward ${escapeHtml(countdown.title)}"
               aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-role="progress">
            <div class="progress__bar" data-role="bar"></div>
          </div>
        </div>
        <div class="progress-label"><span>Progress</span><span data-role="percent">0%</span></div>
        <div class="card__foot">
          <span class="card__date">${formatTarget(countdown.targetDate)}</span>
          <div class="card__actions">
            ${canComplete ? `<button type="button" class="icon-btn icon-btn--complete" data-action="complete" aria-label="${countdown.completed ? 'Reopen' : 'Mark as completed'}: ${escapeHtml(countdown.title)}">${countdown.completed ? 'Reopen' : 'Complete'}</button>` : ''}
            <button type="button" class="icon-btn icon-btn--pin" data-action="pin" aria-pressed="${!!countdown.pinned}" aria-label="${countdown.pinned ? 'Unpin' : 'Pin'} ${escapeHtml(countdown.title)}">${countdown.pinned ? 'Unpin' : 'Pin'}</button>
            <button type="button" class="icon-btn" data-action="edit" aria-label="Edit ${escapeHtml(countdown.title)}">Edit</button>
            <button type="button" class="icon-btn icon-btn--danger" data-action="delete" aria-label="Delete ${escapeHtml(countdown.title)}">Delete</button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    const total = state.countdowns.length;
    el.loading.hidden = true;
    const visible = getVisible();
    el.statTotal.textContent = total;
    el.emptyState.hidden = total !== 0;
    el.noResults.hidden = total === 0 || visible.length !== 0;
    el.grid.hidden = visible.length === 0;
    el.grid.innerHTML = visible.map(cardTemplate).join('');
    tick();
  }

  /** Updates timers, badges and progress bars from the current clock. */
  function tick() {
    const now = Date.now();
    let completed = 0;

    el.grid.querySelectorAll('.card').forEach((card) => {
      const countdown = state.countdowns.find((item) => item._id === card.dataset.id);
      if (!countdown) return;

      const remaining = Date.parse(countdown.targetDate) - now;
      const isDone = remaining <= 0 || !!countdown.completed;
      if (isDone) completed += 1;

      const parts = getTimeParts(remaining);
      const set = (role, text) => {
        const node = card.querySelector(`[data-role="${role}"]`);
        if (node.textContent !== text) node.textContent = text;
      };
      set('days', String(parts.days));
      set('hours', pad(parts.hours));
      set('minutes', pad(parts.minutes));
      set('seconds', pad(parts.seconds));
      set('status', isDone ? 'Completed' : 'Running');

      const percent = isDone ? 100 : getProgress(countdown, now);
      card.querySelector('[data-role="bar"]').style.width = `${percent}%`;
      card.querySelector('[data-role="progress"]').setAttribute('aria-valuenow', String(Math.round(percent)));
      set('percent', `${Math.floor(percent)}%`);
      card.classList.toggle('card--done', isDone);
    });

    const done = state.countdowns.filter((c) => c.completed || Date.parse(c.targetDate) <= now).length;
    el.statDone.textContent = done;
    el.statActive.textContent = state.countdowns.length - done;
  }

  /* ---------- Loading data ---------- */

  async function loadCountdowns() {
    el.loading.hidden = false;
    try {
      const data = await request(API_URL);
      state.countdowns = sortByTarget(data);
      hideError();
    } catch (error) {
      showError(error.message);
    } finally {
      render();
    }
  }

  /* ---------- Create / edit form ---------- */

  const fieldErrorIds = { title: 'titleError', date: 'dateError', time: 'timeError', description: 'descriptionError' };

  function clearFormErrors() {
    Object.values(fieldErrorIds).forEach((id) => { $(id).textContent = ''; });
    [el.titleInput, el.dateInput, el.timeInput, el.descriptionInput].forEach((input) => input.removeAttribute('aria-invalid'));
    el.formError.hidden = true;
    el.formError.textContent = '';
  }

  function setFieldError(field, input, message) {
    $(fieldErrorIds[field]).textContent = message;
    input.setAttribute('aria-invalid', 'true');
  }

  function openForm(countdown) {
    state.editingId = countdown ? countdown._id : null;
    clearFormErrors();
    el.form.reset();
    el.formTitle.textContent = countdown ? 'Edit countdown' : 'New countdown';
    el.saveBtn.textContent = countdown ? 'Save changes' : 'Create countdown';
    el.dateInput.min = toDateInputValue(new Date());

    if (countdown) {
      const target = new Date(countdown.targetDate);
      el.titleInput.value = countdown.title;
      el.dateInput.value = toDateInputValue(target);
      el.timeInput.value = toTimeInputValue(target);
      el.descriptionInput.value = countdown.description || '';
      el.categoryInput.value = countdown.category || 'other';
    }
    el.formDialog.showModal();
    el.titleInput.focus();
  }

  function closeForm() {
    el.formDialog.close();
  }

  /** Returns { valid, payload } after checking every field on the client. */
  function validateForm() {
    clearFormErrors();
    let valid = true;

    const title = el.titleInput.value.trim();
    if (!title) {
      setFieldError('title', el.titleInput, 'Enter a title.');
      valid = false;
    } else if (title.length > 100) {
      setFieldError('title', el.titleInput, 'Keep the title to 100 characters or fewer.');
      valid = false;
    }

    const description = el.descriptionInput.value.trim();
    if (description.length > 500) {
      setFieldError('description', el.descriptionInput, 'Keep the description to 500 characters or fewer.');
      valid = false;
    }

    if (!el.dateInput.value) {
      setFieldError('date', el.dateInput, 'Choose a date.');
      valid = false;
    }
    if (!el.timeInput.value) {
      setFieldError('time', el.timeInput, 'Choose a time.');
      valid = false;
    }

    let targetDate = null;
    if (el.dateInput.value && el.timeInput.value) {
      targetDate = new Date(`${el.dateInput.value}T${el.timeInput.value}`);
      if (Number.isNaN(targetDate.getTime())) {
        setFieldError('date', el.dateInput, 'That date is not valid.');
        valid = false;
      } else if (targetDate.getTime() <= Date.now()) {
        setFieldError('time', el.timeInput, 'Choose a date and time in the future.');
        valid = false;
      }
    }

    return {
      valid,
      payload: valid ? { title, description, category: el.categoryInput.value, targetDate: targetDate.toISOString() } : null,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.isSaving) return; // block duplicate submissions

    const { valid, payload } = validateForm();
    if (!valid) {
      const firstInvalid = el.form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    state.isSaving = true;
    el.saveBtn.disabled = true;
    const idleLabel = el.saveBtn.textContent;
    el.saveBtn.textContent = 'Saving…';

    try {
      if (state.editingId) {
        await request(`${API_URL}/${state.editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      }
      closeForm();
      await loadCountdowns();
    } catch (error) {
      el.formError.textContent = error.message;
      el.formError.hidden = false;
    } finally {
      state.isSaving = false;
      el.saveBtn.disabled = false;
      el.saveBtn.textContent = idleLabel;
    }
  }

  /* ---------- Delete ---------- */

  function askToDelete(countdown) {
    state.pendingDeleteId = countdown._id;
    el.confirmText.textContent = `“${countdown.title}” will be removed permanently.`;
    el.confirmDialog.showModal();
    el.confirmDeleteBtn.focus();
  }

  async function confirmDelete() {
    if (state.isDeleting || !state.pendingDeleteId) return;
    state.isDeleting = true;
    el.confirmDeleteBtn.disabled = true;
    el.confirmDeleteBtn.textContent = 'Deleting…';

    try {
      await request(`${API_URL}/${state.pendingDeleteId}`, { method: 'DELETE' });
      el.confirmDialog.close();
      await loadCountdowns();
    } catch (error) {
      el.confirmDialog.close();
      showError(error.message);
    } finally {
      state.isDeleting = false;
      state.pendingDeleteId = null;
      el.confirmDeleteBtn.disabled = false;
      el.confirmDeleteBtn.textContent = 'Delete countdown';
    }
  }

  /* ---------- Events ---------- */

  $('newCountdownBtn').addEventListener('click', () => openForm(null));
  $('emptyCreateBtn').addEventListener('click', () => openForm(null));
  $('cancelFormBtn').addEventListener('click', closeForm);
  $('cancelDeleteBtn').addEventListener('click', () => el.confirmDialog.close());
  $('confirmDeleteBtn').addEventListener('click', confirmDelete);
  $('retryBtn').addEventListener('click', loadCountdowns);
  $('dismissErrorBtn').addEventListener('click', hideError);
  el.form.addEventListener('submit', handleSubmit);

  el.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const card = button.closest('.card');
    const countdown = state.countdowns.find((item) => item._id === card.dataset.id);
    if (!countdown) return;
    if (button.dataset.action === 'complete') toggleComplete(countdown);
    if (button.dataset.action === 'pin') togglePin(countdown);
    if (button.dataset.action === 'edit') openForm(countdown);
    if (button.dataset.action === 'delete') askToDelete(countdown);
  });

  // Close a dialog when the dark backdrop is clicked
  [el.formDialog, el.confirmDialog].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  /* ---------- Pin, search and filters ---------- */

  async function togglePin(countdown) {
    try {
      await request(`${API_URL}/${countdown._id}/pin`, { method: 'PATCH', body: JSON.stringify({ pinned: !countdown.pinned }) });
      await loadCountdowns();
    } catch (error) {
      showError(error.message);
    }
  }

  async function toggleComplete(countdown) {
    try {
      await request(`${API_URL}/${countdown._id}/complete`, { method: 'PATCH', body: JSON.stringify({ completed: !countdown.completed }) });
      await loadCountdowns();
    } catch (error) {
      showError(error.message);
    }
  }

  el.searchInput.addEventListener('input', () => { state.query = el.searchInput.value; render(); });
  el.categoryFilter.addEventListener('change', () => { state.category = el.categoryFilter.value; render(); });
  $('statusFilters').addEventListener('click', (event) => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    document.querySelectorAll('#statusFilters .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    render();
  });

  /* ---------- Start ---------- */

  setInterval(tick, 1000);
  loadCountdowns();
})();