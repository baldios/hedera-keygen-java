// ===== Storage =====
const STORAGE_KEY = 'taskflow_tasks';
const THEME_KEY   = 'taskflow_theme';

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ===== Date helpers =====
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function weekEnd() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function dateStatus(dateStr) {
  if (!dateStr) return null;
  const t = today();
  if (dateStr < t) return 'overdue';
  if (dateStr === t) return 'today';
  const w = weekEnd();
  if (dateStr <= w) return 'soon';
  return 'future';
}

function dateLabel(dateStr) {
  const s = dateStatus(dateStr);
  if (s === 'overdue') return '⚠ Scaduto';
  if (s === 'today')   return '📅 Oggi';
  if (s === 'soon')    return `📅 ${formatDate(dateStr)}`;
  return `📅 ${formatDate(dateStr)}`;
}

// ===== Priority helpers =====
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };
const PRIORITY_LABEL = { high: '🔥 Alta', medium: '⚡ Media', low: '✓ Bassa', none: '' };
const PRIORITY_CLASS = { high: 'badge-priority-high', medium: 'badge-priority-medium', low: 'badge-priority-low', none: 'badge-priority-none' };
const CAT_CLASS      = { work: 'badge-cat-work', personal: 'badge-cat-personal', other: 'badge-cat-other' };
const CAT_LABEL      = { work: '💼 Lavoro', personal: '🏠 Personale', other: '📌 Altro' };
const FILTER_TITLES  = {
  all: 'Tutti i compiti', today: 'Oggi', week: 'Questa settimana',
  overdue: 'In ritardo', high: 'Alta priorità', done: 'Completati'
};

// ===== State =====
let tasks       = loadTasks();
let activeFilter = 'all';
let activeSort   = 'dueDate';
let isGridView   = false;

// ===== DOM refs =====
const taskList       = document.getElementById('taskList');
const emptyState     = document.getElementById('emptyState');
const quickAddForm   = document.getElementById('quickAddForm');
const quickAddInput  = document.getElementById('quickAddInput');
const quickDate      = document.getElementById('quickDate');
const quickPriority  = document.getElementById('quickPriority');
const quickCategory  = document.getElementById('quickCategory');
const sortSelect     = document.getElementById('sortSelect');
const pageTitle      = document.getElementById('pageTitle');
const sidebar        = document.getElementById('sidebar');
const overlay        = document.getElementById('overlay');
const menuToggle     = document.getElementById('menuToggle');
const sidebarClose   = document.getElementById('sidebarClose');
const themeToggle    = document.getElementById('themeToggle');
const modalBackdrop  = document.getElementById('modalBackdrop');
const modalForm      = document.getElementById('modalForm');
const modalClose     = document.getElementById('modalClose');
const modalCancel    = document.getElementById('modalCancel');
const notifBtn       = document.getElementById('notifBtn');
const notifIcon      = document.getElementById('notifIcon');
const notifLabel     = document.getElementById('notifLabel');
const toastContainer = document.getElementById('toastContainer');
const viewList       = document.getElementById('viewList');
const viewGrid       = document.getElementById('viewGrid');

// ===== Theme =====
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.textContent = dark ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem(THEME_KEY);
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);

themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme !== 'dark');
});

// ===== Sidebar =====
function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('visible');
  document.body.style.overflow = '';
}

menuToggle.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// ===== Filter navigation =====
function setFilter(filter) {
  activeFilter = filter;
  pageTitle.textContent = FILTER_TITLES[filter];

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === filter);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === filter);
  });

  renderTasks();
  closeSidebar();
}

document.querySelectorAll('[data-filter]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); setFilter(el.dataset.filter); });
});

// ===== Sort =====
sortSelect.addEventListener('change', () => { activeSort = sortSelect.value; renderTasks(); });

// ===== View toggle =====
viewList.addEventListener('click', () => {
  isGridView = false;
  viewList.classList.add('active');
  viewGrid.classList.remove('active');
  taskList.classList.remove('grid-view');
});

viewGrid.addEventListener('click', () => {
  isGridView = true;
  viewGrid.classList.add('active');
  viewList.classList.remove('active');
  taskList.classList.add('grid-view');
});

// ===== Filtering =====
function applyFilter(task) {
  const t = today();
  const w = weekEnd();
  switch (activeFilter) {
    case 'all':     return !task.done;
    case 'today':   return !task.done && task.dueDate === t;
    case 'week':    return !task.done && task.dueDate && task.dueDate >= t && task.dueDate <= w;
    case 'overdue': return !task.done && task.dueDate && task.dueDate < t;
    case 'high':    return !task.done && task.priority === 'high';
    case 'done':    return task.done;
    default:        return true;
  }
}

// ===== Sorting =====
function sortTasks(a, b) {
  if (activeSort === 'priority') {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
  }
  if (activeSort === 'dueDate' || activeSort === 'priority') {
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
  }
  if (activeSort === 'title') return a.title.localeCompare(b.title);
  return b.createdAt - a.createdAt;
}

// ===== Build task card HTML =====
function buildCard(task) {
  const ds = task.dueDate ? dateStatus(task.dueDate) : null;
  const dl = task.dueDate ? dateLabel(task.dueDate) : null;
  const pc = PRIORITY_CLASS[task.priority];
  const pl = PRIORITY_LABEL[task.priority];
  const cc = CAT_CLASS[task.category] || CAT_CLASS.other;
  const cl = CAT_LABEL[task.category] || CAT_LABEL.other;

  return `
    <div class="task-card ${task.done ? 'done' : ''}" data-id="${task.id}" data-priority="${task.priority}">
      <div class="task-checkbox" role="checkbox" aria-checked="${task.done}" aria-label="Segna completato" tabindex="0">
        ${task.done ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          ${pl ? `<span class="badge ${pc}">${pl}</span>` : ''}
          ${dl ? `<span class="badge badge-date ${ds || ''}">${dl}</span>` : ''}
          <span class="badge ${cc}">${cl}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit" title="Modifica" aria-label="Modifica compito">✏️</button>
        <button class="task-action-btn delete" title="Elimina" aria-label="Elimina compito">🗑️</button>
      </div>
    </div>`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== Render =====
function renderTasks() {
  const filtered = tasks.filter(applyFilter).sort(sortTasks);

  if (filtered.length === 0) {
    taskList.innerHTML = '';
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    taskList.innerHTML = filtered.map(buildCard).join('');
  }

  updateBadges();
}

// ===== Badge counts =====
function updateBadges() {
  const t = today();
  const w = weekEnd();
  const active = tasks.filter(t => !t.done);

  document.getElementById('badge-all').textContent     = active.length || '';
  document.getElementById('badge-today').textContent   = active.filter(x => x.dueDate === t).length || '';
  document.getElementById('badge-week').textContent    = active.filter(x => x.dueDate && x.dueDate >= t && x.dueDate <= w).length || '';
  document.getElementById('badge-overdue').textContent = active.filter(x => x.dueDate && x.dueDate < t).length || '';
  document.getElementById('badge-high').textContent    = active.filter(x => x.priority === 'high').length || '';
  document.getElementById('badge-done').textContent    = tasks.filter(x => x.done).length || '';
}

// ===== Task actions (event delegation) =====
taskList.addEventListener('click', e => {
  const card = e.target.closest('.task-card');
  if (!card) return;
  const id = card.dataset.id;

  if (e.target.closest('.task-checkbox')) { toggleDone(id); return; }
  if (e.target.closest('.edit'))          { openEditModal(id); return; }
  if (e.target.closest('.delete'))        { deleteTask(id); return; }
});

taskList.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    if (e.target.classList.contains('task-checkbox')) {
      e.preventDefault();
      const card = e.target.closest('.task-card');
      if (card) toggleDone(card.dataset.id);
    }
  }
});

// ===== CRUD =====
function createTask({ title, description = '', dueDate = '', priority = 'none', category = 'work' }) {
  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: title.trim(),
    description: description.trim(),
    dueDate,
    priority,
    category,
    done: false,
    createdAt: Date.now()
  };
  tasks.unshift(task);
  saveTasks(tasks);
  return task;
}

function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveTasks(tasks);
  renderTasks();
  showToast(task.done ? '✅ Compito completato!' : '↩ Compito riattivato', 'success');
}

function deleteTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  const [removed] = tasks.splice(idx, 1);
  saveTasks(tasks);
  renderTasks();
  showToast(`🗑️ "${removed.title.slice(0,30)}" eliminato`, 'info');
}

function updateTask(id, fields) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  Object.assign(task, fields);
  saveTasks(tasks);
  renderTasks();
}

// ===== Quick Add =====
quickAddForm.addEventListener('submit', e => {
  e.preventDefault();
  const title = quickAddInput.value.trim();
  if (!title) return;

  createTask({
    title,
    dueDate:     quickDate.value,
    priority:    quickPriority.value,
    category:    quickCategory.value,
  });

  quickAddInput.value = '';
  quickDate.value     = '';
  quickPriority.value = 'none';
  quickCategory.value = 'work';

  renderTasks();
  showToast('✅ Compito aggiunto', 'success');
  scheduleNotifications();
});

// Set today as default minimum date
quickDate.min = today();

// ===== Edit Modal =====
function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('editId').value          = id;
  document.getElementById('editTitle').value       = task.title;
  document.getElementById('editDesc').value        = task.description;
  document.getElementById('editDate').value        = task.dueDate;
  document.getElementById('editPriority').value    = task.priority;
  document.getElementById('editCategory').value    = task.category;

  modalBackdrop.hidden = false;
  document.getElementById('editTitle').focus();
}

function closeModal() { modalBackdrop.hidden = true; }

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

modalForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  updateTask(id, {
    title:       document.getElementById('editTitle').value.trim(),
    description: document.getElementById('editDesc').value.trim(),
    dueDate:     document.getElementById('editDate').value,
    priority:    document.getElementById('editPriority').value,
    category:    document.getElementById('editCategory').value,
  });
  closeModal();
  showToast('💾 Modifiche salvate', 'success');
  scheduleNotifications();
});

// ===== Toast =====
function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

// ===== Notifications =====
function updateNotifUI() {
  const perm = Notification.permission;
  if (perm === 'granted') {
    notifIcon.textContent  = '🔔';
    notifLabel.textContent = 'Notifiche attive';
  } else if (perm === 'denied') {
    notifIcon.textContent  = '🔕';
    notifLabel.textContent = 'Notifiche bloccate';
  } else {
    notifIcon.textContent  = '🔔';
    notifLabel.textContent = 'Abilita notifiche';
  }
}

notifBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) {
    showToast('❌ Notifiche non supportate dal browser', 'error');
    return;
  }
  if (Notification.permission === 'denied') {
    showToast('⚠ Abilita le notifiche nelle impostazioni del browser', 'error');
    return;
  }
  const perm = await Notification.requestPermission();
  updateNotifUI();
  if (perm === 'granted') {
    showToast('✅ Notifiche abilitate!', 'success');
    scheduleNotifications();
  }
});

function scheduleNotifications() {
  if (Notification.permission !== 'granted') return;

  const t   = today();
  const overdue  = tasks.filter(x => !x.done && x.dueDate && x.dueDate < t);
  const dueToday = tasks.filter(x => !x.done && x.dueDate === t);

  if (overdue.length > 0) {
    new Notification('⚠️ Compiti scaduti — TaskFlow', {
      body: `Hai ${overdue.length} compito/i scaduto/i. Controlla la lista "In ritardo".`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>'
    });
  }

  if (dueToday.length > 0) {
    new Notification('📅 Compiti in scadenza oggi — TaskFlow', {
      body: dueToday.map(t => `• ${t.title}`).slice(0, 5).join('\n'),
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>'
    });
  }
}

// Check notifications on load (once per session via flag)
function checkDueDatesOnLoad() {
  if (Notification.permission !== 'granted') return;
  const alreadyNotified = sessionStorage.getItem('tf_notified');
  if (alreadyNotified) return;
  sessionStorage.setItem('tf_notified', '1');

  const t = today();
  const urgent = tasks.filter(x => !x.done && x.dueDate && x.dueDate <= t);
  if (urgent.length > 0) {
    setTimeout(() => scheduleNotifications(), 2000);
  }
}

// ===== Keyboard shortcut: N to focus quick add =====
document.addEventListener('keydown', e => {
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    quickAddInput.focus();
  }
});

// ===== Demo data (first run only) =====
function seedDemoData() {
  if (tasks.length > 0) return;

  const t = today();
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const nextWeek = (() => { const d = new Date(); d.setDate(d.getDate()+5); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  [
    { title: 'Revisione relazione trimestrale', description: 'Controllare e aggiornare i dati del Q1', dueDate: t, priority: 'high', category: 'work' },
    { title: 'Chiamata con il cliente Rossi', description: 'Presentare il piano di progetto', dueDate: tomorrow, priority: 'high', category: 'work' },
    { title: 'Pagare bolletta luce', dueDate: yesterday, priority: 'medium', category: 'personal' },
    { title: 'Preparare presentazione', description: 'Slide per meeting di venerdì', dueDate: nextWeek, priority: 'medium', category: 'work' },
    { title: 'Comprare regalo anniversario', dueDate: nextWeek, priority: 'low', category: 'personal' },
    { title: 'Aggiornare documentazione API', description: 'Aggiungere esempi per i nuovi endpoint', dueDate: '', priority: 'low', category: 'work' },
  ].forEach(d => tasks.push({ ...d, id: Date.now().toString(36) + Math.random().toString(36).slice(2), done: false, createdAt: Date.now() - Math.random()*86400000 }));

  saveTasks(tasks);
}

// ===== Init =====
seedDemoData();
updateNotifUI();
renderTasks();
checkDueDatesOnLoad();
