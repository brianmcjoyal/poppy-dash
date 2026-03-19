// ---- Utilities ----
function getPregnancyInfo() {
  const now = new Date();
  const lmpDate = new Date(DUE_DATE);
  lmpDate.setDate(lmpDate.getDate() - 280);

  const diffMs = now - lmpDate;
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const daysLeft = Math.ceil((DUE_DATE - now) / (1000 * 60 * 60 * 24));
  const progressPercent = Math.min(100, Math.max(0, (totalDays / 280) * 100));

  return { weeks, days, daysLeft, progressPercent, totalDays };
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function store(key, data) {
  localStorage.setItem('poppy-' + key, JSON.stringify(data));
}

function load(key, fallback) {
  const saved = localStorage.getItem('poppy-' + key);
  return saved ? JSON.parse(saved) : fallback;
}

// ---- Tab Navigation ----
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ---- Summary Cards ----
function renderDate() {
  document.getElementById('current-date').textContent = formatDate(new Date());
}

function renderCountdown(info) {
  const el = document.getElementById('days-left');
  if (info.daysLeft > 0) {
    el.textContent = info.daysLeft;
  } else if (info.daysLeft === 0) {
    el.textContent = '🎉';
    document.querySelector('.countdown-label').textContent = "It's due date day!";
  } else {
    el.textContent = Math.abs(info.daysLeft);
    document.querySelector('.countdown-label').textContent = 'days past due date';
  }
}

function renderWeekTracker(info) {
  const weekNum = Math.min(42, Math.max(1, info.weeks));
  document.getElementById('current-week').textContent = weekNum;
  document.getElementById('week-days').textContent = `+ ${info.days} day${info.days !== 1 ? 's' : ''}`;
  document.getElementById('progress-bar').style.width = `${info.progressPercent}%`;
  document.getElementById('progress-label').textContent = `${Math.round(info.progressPercent)}% of the way there`;
}

function renderBabySize(info) {
  const week = Math.min(42, Math.max(4, info.weeks));
  const size = BABY_SIZES[week] || BABY_SIZES[40];
  document.getElementById('size-emoji').textContent = size.emoji;
  document.getElementById('size-name').textContent = `Size of a ${size.name}`;
  let detail = size.length;
  if (size.weight) detail += ` · ${size.weight}`;
  document.getElementById('size-detail').textContent = detail;
}

function renderMilestones(info) {
  const week = Math.min(42, Math.max(4, info.weeks));
  const milestones = MILESTONES[week] || ['Growing and developing!'];
  const list = document.getElementById('milestone-list');
  list.innerHTML = '';
  milestones.forEach((m) => {
    const li = document.createElement('li');
    li.textContent = m;
    list.appendChild(li);
  });
}

// ---- Chores ----
function loadChores() {
  // Migrate old key
  const old = localStorage.getItem('baby-dashboard-chores');
  if (old && !localStorage.getItem('poppy-chores')) {
    localStorage.setItem('poppy-chores', old);
  }
  return load('chores', [...DEFAULT_CHORES]);
}

function renderChores() {
  const chores = loadChores();
  const list = document.getElementById('chore-list');
  const countEl = document.getElementById('chore-count');
  list.innerHTML = '';
  const doneCount = chores.filter((c) => c.done).length;
  countEl.textContent = `${doneCount}/${chores.length} done`;

  chores.forEach((chore, i) => {
    const li = document.createElement('li');
    li.className = chore.done ? 'done' : '';
    li.innerHTML = `
      <input type="checkbox" ${chore.done ? 'checked' : ''} />
      <span class="chore-text">${chore.text}</span>
      <button class="chore-delete">×</button>
    `;
    li.querySelector('input').addEventListener('change', () => {
      chores[i].done = !chores[i].done;
      store('chores', chores);
      renderChores();
    });
    li.querySelector('.chore-delete').addEventListener('click', () => {
      chores.splice(i, 1);
      store('chores', chores);
      renderChores();
    });
    list.appendChild(li);
  });
}

document.getElementById('add-chore-btn').addEventListener('click', () => {
  const input = document.getElementById('chore-input');
  if (!input.value.trim()) return;
  const chores = loadChores();
  chores.push({ text: input.value.trim(), done: false });
  store('chores', chores);
  input.value = '';
  renderChores();
});

document.getElementById('chore-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-chore-btn').click();
});

// ---- Appointments ----
function renderAppointments() {
  const appts = load('appointments', []);
  const list = document.getElementById('appt-list');
  const countEl = document.getElementById('appt-count');
  list.innerHTML = '';

  // Sort by date
  appts.sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));

  const upcoming = appts.filter((a) => a.date >= todayStr());
  countEl.textContent = `${upcoming.length} upcoming`;

  appts.forEach((appt, i) => {
    const isPast = appt.date < todayStr();
    const li = document.createElement('li');
    li.className = 'appt-item' + (isPast ? ' past' : '');

    const dateObj = new Date(appt.date + 'T12:00:00');
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = appt.time ? new Date('2000-01-01T' + appt.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

    li.innerHTML = `
      <div class="appt-info">
        <span class="appt-date-badge">${dateStr}${timeStr ? ' · ' + timeStr : ''}</span>
        <span class="appt-text">${appt.text}</span>
      </div>
      <button class="chore-delete">×</button>
    `;
    li.querySelector('.chore-delete').addEventListener('click', () => {
      appts.splice(i, 1);
      store('appointments', appts);
      renderAppointments();
    });
    list.appendChild(li);
  });
}

document.getElementById('add-appt-btn').addEventListener('click', () => {
  const dateInput = document.getElementById('appt-date');
  const timeInput = document.getElementById('appt-time');
  const textInput = document.getElementById('appt-input');
  if (!dateInput.value || !textInput.value.trim()) return;

  const appts = load('appointments', []);
  appts.push({ date: dateInput.value, time: timeInput.value, text: textInput.value.trim() });
  store('appointments', appts);
  textInput.value = '';
  renderAppointments();
});

document.getElementById('appt-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-appt-btn').click();
});

// Set default date to today
document.getElementById('appt-date').value = todayStr();

// ---- Kick Counter ----
function getKickData() {
  return load('kicks', {});
}

function renderKicks() {
  const data = getKickData();
  const today = todayStr();
  const todayKicks = data[today] || 0;

  document.getElementById('kick-count').textContent = todayKicks;

  const log = document.getElementById('kick-log');
  log.innerHTML = '';

  const dates = Object.keys(data).sort().reverse().slice(0, 14);
  dates.forEach((date) => {
    const dateObj = new Date(date + 'T12:00:00');
    const label = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const li = document.createElement('li');
    li.innerHTML = `<span>${label}</span><span class="kick-day-count">${data[date]} kicks</span>`;
    log.appendChild(li);
  });
}

document.getElementById('kick-btn').addEventListener('click', () => {
  const data = getKickData();
  const today = todayStr();
  data[today] = (data[today] || 0) + 1;
  store('kicks', data);
  renderKicks();

  // Button animation
  const btn = document.getElementById('kick-btn');
  btn.classList.add('kicked');
  setTimeout(() => btn.classList.remove('kicked'), 200);
});

document.getElementById('kick-reset').addEventListener('click', () => {
  const data = getKickData();
  delete data[todayStr()];
  store('kicks', data);
  renderKicks();
});

// ---- Contraction Timer ----
let contractionInterval = null;
let contractionStart = null;

function renderContractions() {
  const logs = load('contractions', []);
  const list = document.getElementById('contraction-log');
  const summary = document.getElementById('contraction-summary');
  list.innerHTML = '';

  if (logs.length >= 2) {
    // Calculate averages
    const durations = logs.map((l) => l.duration);
    const intervals = [];
    for (let i = 1; i < logs.length; i++) {
      intervals.push((new Date(logs[i - 1].start) - new Date(logs[i].start)) / 1000);
    }
    const avgDur = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const avgInt = intervals.length > 0 ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0;

    summary.innerHTML = `
      <div class="contraction-stats">
        <div class="stat"><span class="stat-num">${formatSeconds(avgDur)}</span><span class="stat-label">avg duration</span></div>
        <div class="stat"><span class="stat-num">${formatSeconds(avgInt)}</span><span class="stat-label">avg interval</span></div>
        <div class="stat"><span class="stat-num">${logs.length}</span><span class="stat-label">total</span></div>
      </div>
    `;
  } else {
    summary.innerHTML = '';
  }

  logs.forEach((entry, i) => {
    const time = new Date(entry.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    const li = document.createElement('li');
    li.innerHTML = `<span>${time}</span><span class="contraction-dur">${formatSeconds(entry.duration)}</span>`;
    list.appendChild(li);
  });
}

function formatSeconds(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function updateContractionTimer() {
  if (!contractionStart) return;
  const elapsed = Math.floor((Date.now() - contractionStart) / 1000);
  document.getElementById('contraction-time').textContent =
    `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
}

document.getElementById('contraction-start').addEventListener('click', () => {
  contractionStart = Date.now();
  contractionInterval = setInterval(updateContractionTimer, 1000);
  document.getElementById('contraction-start').disabled = true;
  document.getElementById('contraction-stop').disabled = false;
  document.getElementById('contraction-status').textContent = 'Timing...';
});

document.getElementById('contraction-stop').addEventListener('click', () => {
  clearInterval(contractionInterval);
  const duration = Math.round((Date.now() - contractionStart) / 1000);
  const logs = load('contractions', []);
  logs.unshift({ start: new Date(contractionStart).toISOString(), duration });
  store('contractions', logs);

  contractionStart = null;
  document.getElementById('contraction-time').textContent = '0:00';
  document.getElementById('contraction-start').disabled = false;
  document.getElementById('contraction-stop').disabled = true;
  document.getElementById('contraction-status').textContent = 'Ready';
  renderContractions();
});

document.getElementById('contraction-clear').addEventListener('click', () => {
  store('contractions', []);
  renderContractions();
});

// ---- Name Ideas ----
function renderNames() {
  const names = load('names', []);
  const list = document.getElementById('name-list');
  const countEl = document.getElementById('name-count');
  list.innerHTML = '';
  countEl.textContent = `${names.length} name${names.length !== 1 ? 's' : ''}`;

  // Sort by hearts desc
  const sorted = names.map((n, i) => ({ ...n, idx: i })).sort((a, b) => (b.hearts || 0) - (a.hearts || 0));

  sorted.forEach((name) => {
    const li = document.createElement('li');
    li.className = 'name-item';
    li.innerHTML = `
      <button class="heart-btn ${name.hearts > 0 ? 'hearted' : ''}">${name.hearts > 0 ? '❤️' : '🤍'} ${name.hearts || 0}</button>
      <span class="name-text">${name.text}</span>
      <button class="chore-delete">×</button>
    `;
    li.querySelector('.heart-btn').addEventListener('click', () => {
      names[name.idx].hearts = (names[name.idx].hearts || 0) + 1;
      store('names', names);
      renderNames();
    });
    li.querySelector('.chore-delete').addEventListener('click', () => {
      names.splice(name.idx, 1);
      store('names', names);
      renderNames();
    });
    list.appendChild(li);
  });
}

document.getElementById('add-name-btn').addEventListener('click', () => {
  const input = document.getElementById('name-input');
  if (!input.value.trim()) return;
  const names = load('names', []);
  names.push({ text: input.value.trim(), hearts: 0 });
  store('names', names);
  input.value = '';
  renderNames();
});

document.getElementById('name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-name-btn').click();
});

// ---- Shopping List ----
const DEFAULT_SHOPPING = [
  { text: 'Crib or bassinet', category: 'Nursery', done: false },
  { text: 'Crib mattress', category: 'Nursery', done: false },
  { text: 'Changing pad', category: 'Nursery', done: false },
  { text: 'Stroller', category: 'Gear', done: false },
  { text: 'Car seat', category: 'Gear', done: false },
  { text: 'Baby carrier/wrap', category: 'Gear', done: false },
  { text: 'Onesies (newborn + 0-3mo)', category: 'Clothes', done: false },
  { text: 'Sleepers/pajamas', category: 'Clothes', done: false },
  { text: 'Swaddles', category: 'Clothes', done: false },
  { text: 'Bottles', category: 'Feeding', done: false },
  { text: 'Burp cloths', category: 'Feeding', done: false },
  { text: 'Breast pump', category: 'Feeding', done: false },
  { text: 'Diapers (newborn size)', category: 'Diapering', done: false },
  { text: 'Wipes', category: 'Diapering', done: false },
  { text: 'Diaper cream', category: 'Diapering', done: false },
  { text: 'Baby thermometer', category: 'Health', done: false },
  { text: 'Infant Tylenol', category: 'Health', done: false },
  { text: 'Nail clippers', category: 'Health', done: false },
];

function loadShopping() {
  return load('shopping', [...DEFAULT_SHOPPING]);
}

function renderShopping() {
  const items = loadShopping();
  const countEl = document.getElementById('shopping-count');
  const groups = document.getElementById('shopping-groups');
  groups.innerHTML = '';

  const doneCount = items.filter((i) => i.done).length;
  countEl.textContent = `${doneCount}/${items.length} bought`;

  // Group by category
  const categories = {};
  items.forEach((item, i) => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push({ ...item, idx: i });
  });

  Object.keys(categories).sort().forEach((cat) => {
    const section = document.createElement('div');
    section.className = 'shopping-category';
    section.innerHTML = `<h3>${cat}</h3>`;

    const ul = document.createElement('ul');
    ul.className = 'chore-list';

    categories[cat].forEach((item) => {
      const li = document.createElement('li');
      li.className = item.done ? 'done' : '';
      li.innerHTML = `
        <input type="checkbox" ${item.done ? 'checked' : ''} />
        <span class="chore-text">${item.text}</span>
        <button class="chore-delete">×</button>
      `;
      li.querySelector('input').addEventListener('change', () => {
        items[item.idx].done = !items[item.idx].done;
        store('shopping', items);
        renderShopping();
      });
      li.querySelector('.chore-delete').addEventListener('click', () => {
        items.splice(item.idx, 1);
        store('shopping', items);
        renderShopping();
      });
      ul.appendChild(li);
    });

    section.appendChild(ul);
    groups.appendChild(section);
  });
}

document.getElementById('add-shopping-btn').addEventListener('click', () => {
  const input = document.getElementById('shopping-input');
  const cat = document.getElementById('shopping-category').value;
  if (!input.value.trim()) return;
  const items = loadShopping();
  items.push({ text: input.value.trim(), category: cat, done: false });
  store('shopping', items);
  input.value = '';
  renderShopping();
});

document.getElementById('shopping-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-shopping-btn').click();
});

// ---- Weight / Belly Tracker ----
function renderWeight() {
  const entries = load('weight', []);
  const log = document.getElementById('weight-log');
  const canvas = document.getElementById('weight-chart');
  log.innerHTML = '';

  // Sort by date
  entries.sort((a, b) => a.date.localeCompare(b.date));

  // Render log (newest first)
  [...entries].reverse().forEach((entry, i) => {
    const realIdx = entries.length - 1 - i;
    const dateObj = new Date(entry.date + 'T12:00:00');
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const li = document.createElement('li');
    const parts = [];
    if (entry.weight) parts.push(`${entry.weight} lbs`);
    if (entry.belly) parts.push(`${entry.belly} in`);
    li.innerHTML = `
      <span>${label}</span>
      <span class="weight-values">${parts.join(' · ')}</span>
      <button class="chore-delete">×</button>
    `;
    li.querySelector('.chore-delete').addEventListener('click', () => {
      entries.splice(realIdx, 1);
      store('weight', entries);
      renderWeight();
    });
    log.appendChild(li);
  });

  // Draw chart
  drawWeightChart(canvas, entries);
}

function drawWeightChart(canvas, entries) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 200;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (entries.length < 2) {
    ctx.fillStyle = '#8a8a8a';
    ctx.font = '14px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Add at least 2 entries to see the chart', canvas.width / 2, 100);
    return;
  }

  const pad = { top: 20, right: 20, bottom: 30, left: 45 };
  const w = canvas.width - pad.left - pad.right;
  const h = canvas.height - pad.top - pad.bottom;

  const hasWeight = entries.some((e) => e.weight);
  const hasBelly = entries.some((e) => e.belly);

  function drawLine(data, key, color) {
    const points = data.filter((e) => e[key]).map((e, i, arr) => ({
      x: pad.left + (data.indexOf(e) / (data.length - 1)) * w,
      y: 0,
      val: e[key],
    }));
    if (points.length < 2) return;

    const vals = points.map((p) => p.val);
    const min = Math.min(...vals) - 1;
    const max = Math.max(...vals) + 1;

    points.forEach((p) => {
      p.y = pad.top + h - ((p.val - min) / (max - min)) * h;
    });

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    points.forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (hasWeight) drawLine(entries, 'weight', '#e8a87c');
  if (hasBelly) drawLine(entries, 'belly', '#85cdca');

  // X-axis labels
  ctx.fillStyle = '#8a8a8a';
  ctx.font = '11px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const step = Math.max(1, Math.floor(entries.length / 6));
  entries.forEach((e, i) => {
    if (i % step === 0 || i === entries.length - 1) {
      const x = pad.left + (i / (entries.length - 1)) * w;
      const dateObj = new Date(e.date + 'T12:00:00');
      ctx.fillText(dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, canvas.height - 5);
    }
  });

  // Legend
  let legendX = pad.left;
  if (hasWeight) {
    ctx.fillStyle = '#e8a87c';
    ctx.fillRect(legendX, 5, 12, 12);
    ctx.fillStyle = '#3d3d3d';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Weight', legendX + 16, 15);
    legendX += 70;
  }
  if (hasBelly) {
    ctx.fillStyle = '#85cdca';
    ctx.fillRect(legendX, 5, 12, 12);
    ctx.fillStyle = '#3d3d3d';
    ctx.fillText('Belly', legendX + 16, 15);
  }
}

document.getElementById('weight-date').value = todayStr();

document.getElementById('add-weight-btn').addEventListener('click', () => {
  const date = document.getElementById('weight-date').value;
  const weight = parseFloat(document.getElementById('weight-value').value) || null;
  const belly = parseFloat(document.getElementById('belly-value').value) || null;
  if (!date || (!weight && !belly)) return;

  const entries = load('weight', []);
  // Update existing entry for same date or add new
  const existing = entries.findIndex((e) => e.date === date);
  if (existing >= 0) {
    if (weight) entries[existing].weight = weight;
    if (belly) entries[existing].belly = belly;
  } else {
    entries.push({ date, weight, belly });
  }
  store('weight', entries);
  document.getElementById('weight-value').value = '';
  document.getElementById('belly-value').value = '';
  renderWeight();
});

// ---- News Feed ----
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  return days + 'd ago';
}

function renderNews(items) {
  const list = document.getElementById('news-list');
  if (!items || items.length === 0) {
    list.innerHTML = '<li class="news-error">No stories available</li>';
    return;
  }
  list.innerHTML = items.slice(0, 10).map(item => {
    const title = item.title || 'Untitled';
    const link = item.link || '#';
    const pubDate = item.pubDate || '';
    return `<li class="news-item">
      <a href="${link}" target="_blank" rel="noopener">${title}</a>
      ${pubDate ? `<div class="news-time">${timeAgo(pubDate)}</div>` : ''}
    </li>`;
  }).join('');
}

function fetchNews() {
  const rssUrls = [
    'https://feeds.nbcnews.com/msnbc/public/news',
    'https://feeds.nbcnews.com/nbcnews/public/news',
    'https://www.msnbc.com/feeds/latest'
  ];
  const proxyBase = 'https://api.rss2json.com/v1/api.json?rss_url=';

  function tryFeed(index) {
    if (index >= rssUrls.length) {
      document.getElementById('news-list').innerHTML =
        '<li class="news-error">Could not load news</li>';
      return;
    }
    fetch(proxyBase + encodeURIComponent(rssUrls[index]))
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok' && data.items && data.items.length > 0) {
          renderNews(data.items);
        } else {
          tryFeed(index + 1);
        }
      })
      .catch(() => tryFeed(index + 1));
  }

  tryFeed(0);
}

// ---- Initialize ----
function init() {
  const info = getPregnancyInfo();
  renderDate();
  renderCountdown(info);
  renderWeekTracker(info);
  renderBabySize(info);
  renderMilestones(info);
  renderChores();
  renderAppointments();
  renderKicks();
  renderContractions();
  renderNames();
  renderShopping();
  renderWeight();
  fetchNews();
}

init();
