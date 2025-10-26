/* Sleek Todo — app.js (enhanced)
   Added:
   - Drag-and-drop manual ordering (sort-by 'manual')
   - Custom category creation, persisted
   - Reminders using Notification API + in-page scheduling
*/

const STORAGE_KEY = 'sleek-todo.tasks.v1';
const THEME_KEY = 'sleek-todo.theme.v1';
const CATS_KEY = 'sleek-todo.categories.v1';

let tasks = [];
let categories = [];
let editingId = null;
let reminderTimeouts = new Map();

const MAX_TIMEOUT = 2147483647; // ~24.8 days - JS setTimeout limit

/* DOM elements */
const form = document.getElementById('task-form');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const categoryInput = document.getElementById('category');
const newCategoryInput = document.getElementById('new-category');
const addCategoryBtn = document.getElementById('add-category');
const priorityInput = document.getElementById('priority');
const dueInput = document.getElementById('dueDateTime');
const idInput = document.getElementById('task-id');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');
const listEl = document.getElementById('task-list');
const emptyStateEl = document.getElementById('empty-state');

const remindEnabled = document.getElementById('remind-enabled');
const remindOffset = document.getElementById('remind-offset');
const remindUnit = document.getElementById('remind-unit');

const statusFilter = document.getElementById('status-filter');
const categoryFilter = document.getElementById('category-filter');
const sortBy = document.getElementById('sort-by');
const clearCompletedBtn = document.getElementById('clear-completed');
const summaryEl = document.getElementById('summary');

const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

/* Init */
document.addEventListener('DOMContentLoaded', init);

function init(){
  loadTheme();
  loadCategories();
  loadTasks();
  bindEvents();
  render();
  requestNotificationPermission();
  scheduleAllReminders();
}

function bindEvents(){
  form.addEventListener('submit', onSubmit);
  resetBtn.addEventListener('click', resetForm);
  statusFilter.addEventListener('change', render);
  categoryFilter.addEventListener('change', render);
  sortBy.addEventListener('change', render);
  clearCompletedBtn.addEventListener('click', clearCompleted);
  themeToggle.addEventListener('click', toggleTheme);
  addCategoryBtn.addEventListener('click', onAddCategory);
  newCategoryInput.addEventListener('keyup', (e) => { if(e.key === 'Enter') onAddCategory(); });
}

function loadTheme(){
  const t = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(t);
}

function setTheme(t){
  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  themeToggle.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
  themeIcon.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, t);
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function loadCategories(){
  try{
    const raw = localStorage.getItem(CATS_KEY);
    if(raw){
      categories = JSON.parse(raw);
    } else {
      categories = ['Personal','Work','Errands','Other'];
      localStorage.setItem(CATS_KEY, JSON.stringify(categories));
    }
  } catch(e){
    console.error('Failed to parse categories', e);
    categories = ['Personal','Work','Errands','Other'];
  }
  populateCategorySelects();
}

function saveCategories(){
  localStorage.setItem(CATS_KEY, JSON.stringify(categories));
  populateCategorySelects();
}

function populateCategorySelects(){
  // form category select
  categoryInput.innerHTML = '';
  categories.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    categoryInput.appendChild(o);
  });

  // filter select
  const prev = categoryFilter.value || 'all';
  categoryFilter.innerHTML = '';
  const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = 'All';
  categoryFilter.appendChild(allOpt);
  categories.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    categoryFilter.appendChild(o);
  });
  categoryFilter.value = prev;
}

/* Tasks storage */
function loadTasks(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      tasks = JSON.parse(raw);
      // ensure backward compatibility: if dueDate exists (date only) convert
      tasks.forEach(t => {
        if(t.dueDate && !t.dueDateTime){
          // convert date to datetime at noon to avoid timezone issues
          t.dueDateTime = t.dueDate + 'T12:00';
        }
        if(typeof t.order === 'undefined') t.order = t.createdAt || Date.now();
      });
    } else {
      // seed
      tasks = [
        {
          id: genId(),
          title: "Plan weekly sprint",
          description: "Prioritize tickets & blockers",
          category: "Work",
          priority: 3,
          dueDateTime: addDaysISOTime(2),
          completed: false,
          createdAt: Date.now(),
          order: Date.now()
        },
        {
          id: genId(),
          title: "Grocery shopping",
          description: "Milk, eggs, greens",
          category: "Personal",
          priority: 1,
          dueDateTime: addDaysISOTime(5),
          completed: false,
          createdAt: Date.now() - 1000*60*60*24,
          order: Date.now() - 1000
        },
        {
          id: genId(),
          title: "Submit tax documents",
          description: "",
          category: "Personal",
          priority: 3,
          dueDateTime: addDaysISOTime(-1),
          completed: false,
          createdAt: Date.now() - 1000*60*60*24*7,
          order: Date.now() - 2000
        }
      ];
      saveTasks();
    }
  } catch (e){
    console.error('Failed to parse tasks', e);
    tasks = [];
  }
}

function saveTasks(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  // reschedule reminders after save (task changes)
  scheduleAllReminders();
}

function genId(){ return 't_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36); }
function addDaysISOTime(days){
  const d = new Date();
  d.setDate(d.getDate() + days);
  // default time to 09:00 local for seeded tasks
  d.setHours(9,0,0,0);
  return d.toISOString().slice(0,16);
}

/* Form handling */
function onSubmit(ev){
  ev.preventDefault();
  const title = titleInput.value.trim();
  if(!title) return;

  const payload = {
    title,
    description: descInput.value.trim(),
    category: categoryInput.value,
    priority: Number(priorityInput.value),
    dueDateTime: dueInput.value || '',
    reminder: {
      enabled: remindEnabled.checked,
      offset: Number(remindOffset.value) || 0,
      unit: remindUnit.value || 'minutes'
    }
  };

  if(idInput.value){
    const id = idInput.value;
    const idx = tasks.findIndex(t => t.id === id);
    if(idx !== -1){
      tasks[idx] = {
        ...tasks[idx],
        ...payload
      };
      editingId = null;
      saveBtn.textContent = 'Add Task';
    }
  } else {
    const now = Date.now();
    const task = {
      id: genId(),
      ...payload,
      completed: false,
      createdAt: now,
      order: now
    };
    tasks.unshift(task);
  }
  resetForm();
  saveTasks();
  render();
}

function resetForm(){
  form.reset();
  idInput.value = '';
  editingId = null;
  saveBtn.textContent = 'Add Task';
}

/* Categories */
function onAddCategory(){
  const v = newCategoryInput.value.trim();
  if(!v) return;
  if(!categories.includes(v)){
    categories.push(v);
    saveCategories();
    newCategoryInput.value = '';
  } else {
    newCategoryInput.value = '';
  }
}

/* Rendering, filters and sorting */
function render(){
  const status = statusFilter.value;
  const category = categoryFilter.value;
  const sortVal = sortBy.value;

  let out = [...tasks];

  if(status === 'active') out = out.filter(t => !t.completed);
  if(status === 'completed') out = out.filter(t => t.completed);
  if(category !== 'all') out = out.filter(t => t.category === category);

  out.sort((a,b) => {
    switch(sortVal){
      case 'created_desc': return b.createdAt - a.createdAt;
      case 'created_asc': return a.createdAt - b.createdAt;
      case 'due_asc': return compareDue(a,b, true);
      case 'due_desc': return compareDue(a,b,false);
      case 'priority_asc': return a.priority - b.priority;
      case 'priority_desc': return b.priority - a.priority;
      case 'manual': return (a.order || 0) - (b.order || 0);
      default: return b.createdAt - a.createdAt;
    }
  });

  listEl.innerHTML = '';
  if(out.length === 0){
    emptyStateEl.style.display = 'block';
  } else {
    emptyStateEl.style.display = 'none';
  }

  out.forEach(task => {
    const li = renderTaskItem(task);
    listEl.appendChild(li);
  });

  enableDragAndDrop();
  updateSummary();
}

function compareDue(a,b, asc = true){
  const da = a.dueDateTime ? new Date(a.dueDateTime) : null;
  const db = b.dueDateTime ? new Date(b.dueDateTime) : null;
  if(!da && !db) return 0;
  if(!da) return asc ? 1 : -1;
  if(!db) return asc ? -1 : 1;
  return asc ? da - db : db - da;
}

function updateSummary(){
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;
  summaryEl.textContent = `${active} active • ${completed} done`;
}

/* Render a single task DOM node */
function renderTaskItem(task){
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');
  li.setAttribute('data-id', task.id);
  li.setAttribute('draggable', 'true');

  // drag handle
  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.title = 'Drag to reorder';
  handle.textContent = '⋮';
  li.appendChild(handle);

  // checkbox
  const checkbox = document.createElement('button');
  checkbox.className = 'checkbox';
  checkbox.title = task.completed ? 'Mark as active' : 'Mark as complete';
  checkbox.innerHTML = task.completed ? '✔' : '';
  checkbox.addEventListener('click', () => toggleComplete(task.id));
  li.appendChild(checkbox);

  // main content
  const main = document.createElement('div');
  main.className = 'task-main';

  const titleRow = document.createElement('div');
  titleRow.className = 'task-title';

  const titleText = document.createElement('div');
  titleText.className = 'title-text';
  titleText.textContent = task.title;
  titleRow.appendChild(titleText);

  // priority tag
  const tag = document.createElement('span');
  tag.className = 'tag ' + (task.priority === 3 ? 'high' : task.priority === 2 ? 'med' : 'low');
  tag.textContent = task.priority === 3 ? 'High' : task.priority === 2 ? 'Medium' : 'Low';
  titleRow.appendChild(tag);

  main.appendChild(titleRow);

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const parts = [];
  if(task.category) parts.push(task.category);
  if(task.dueDateTime){
    const due = new Date(task.dueDateTime);
    const now = new Date();
    const dueStr = due.toLocaleString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    const overdue = (!task.completed) && (due < now);
    parts.push(overdue ? `Due: ${dueStr} (overdue)` : `Due: ${dueStr}`);
  }
  if(task.description) parts.push(task.description);
  if(task.reminder && task.reminder.enabled) {
    const off = task.reminder.offset || 0;
    parts.push(`Reminder: ${off} ${task.reminder.unit} before`);
  }
  meta.textContent = parts.join(' · ');
  main.appendChild(meta);

  li.appendChild(main);

  // actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'icon-btn';
  editBtn.title = 'Edit task';
  editBtn.innerHTML = '✏️';
  editBtn.addEventListener('click', () => editTask(task.id));
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn';
  deleteBtn.title = 'Delete task';
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.addEventListener('click', () => deleteTask(task.id));
  actions.appendChild(deleteBtn);

  li.appendChild(actions);

  return li;
}

/* Drag-and-drop ordering */
function enableDragAndDrop(){
  let dragEl = null;

  listEl.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      dragEl = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', item.dataset.id); } catch(_) {}
    });

    item.addEventListener('dragend', () => {
      if(dragEl) dragEl.classList.remove('dragging');
      dragEl = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = e.currentTarget;
      if(target === dragEl) return;
      const rect = target.getBoundingClientRect();
      const next = (e.clientY - rect.top) > (rect.height / 2);
      if(next) target.after(dragEl);
      else target.before(dragEl);
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      // reorder tasks array based on DOM order
      const ids = Array.from(listEl.children).map(li => li.dataset.id);
      tasks.sort((a,b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      // update order property to persist manual order
      tasks.forEach((t,i) => t.order = i + 1);
      saveTasks();
      render();
    });
  });
}

/* Actions */
function toggleComplete(id){
  const idx = tasks.findIndex(t => t.id === id);
  if(idx === -1) return;
  tasks[idx].completed = !tasks[idx].completed;
  saveTasks();
  render();
}

function editTask(id){
  const t = tasks.find(x => x.id === id);
  if(!t) return;
  idInput.value = t.id;
  titleInput.value = t.title;
  descInput.value = t.description || '';
  categoryInput.value = t.category || categories[0] || 'Personal';
  priorityInput.value = String(t.priority || 2);
  dueInput.value = t.dueDateTime || '';
  remindEnabled.checked = !!(t.reminder && t.reminder.enabled);
  remindOffset.value = (t.reminder && t.reminder.offset) || 30;
  remindUnit.value = (t.reminder && t.reminder.unit) || 'minutes';
  saveBtn.textContent = 'Save';
  editingId = id;
  window.scrollTo({top:0,behavior:'smooth'});
}

function deleteTask(id){
  if(!confirm('Delete this task?')) return;
  // clear potential reminder
  clearReminderTimeout(id);
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function clearCompleted(){
  if(!confirm('Remove all completed tasks?')) return;
  tasks.forEach(t => { if(t.completed) clearReminderTimeout(t.id); });
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
}

/* Reminders (Notification API) */
function requestNotificationPermission(){
  if('Notification' in window && Notification.permission === 'default'){
    Notification.requestPermission().then(p => {
      // no-op
    });
  }
}

function scheduleAllReminders(){
  // clear existing timeouts
  reminderTimeouts.forEach((to, k) => clearTimeout(to));
  reminderTimeouts.clear();

  tasks.forEach(task => {
    scheduleReminderForTask(task);
  });
}

function scheduleReminderForTask(task){
  // clear existing timeout for that task
  clearReminderTimeout(task.id);

  if(!task || !task.reminder || !task.reminder.enabled) return;
  if(task.completed) return;
  if(!task.dueDateTime) return;

  const due = new Date(task.dueDateTime);
  let offsetMs = 0;
  const off = Number(task.reminder.offset || 0);
  switch(task.reminder.unit){
    case 'minutes': offsetMs = off * 60 * 1000; break;
    case 'hours': offsetMs = off * 60 * 60 * 1000; break;
    case 'days': offsetMs = off * 24 * 60 * 60 * 1000; break;
    default: offsetMs = off * 60 * 1000;
  }

  const notifyAt = due.getTime() - offsetMs;
  const now = Date.now();
  const delay = notifyAt - now;
  if(delay <= 0){
    // time already passed; do not schedule, but you could show immediate notification
    return;
  }
  if(delay > MAX_TIMEOUT){
    // too far in the future for setTimeout; skip scheduling (could implement periodic check)
    return;
  }

  const to = setTimeout(() => {
    showReminderNotification(task);
    reminderTimeouts.delete(task.id);
  }, delay);

  reminderTimeouts.set(task.id, to);
}

function clearReminderTimeout(taskId){
  const to = reminderTimeouts.get(taskId);
  if(to) {
    clearTimeout(to);
    reminderTimeouts.delete(taskId);
  }
}

function showReminderNotification(task){
  const title = `Reminder: ${task.title}`;
  const bodyParts = [];
  if(task.category) bodyParts.push(task.category);
  if(task.dueDateTime) bodyParts.push(new Date(task.dueDateTime).toLocaleString());
  if(task.description) bodyParts.push(task.description);
  const body = bodyParts.join(' • ');
  if('Notification' in window && Notification.permission === 'granted'){
    new Notification(title, { body, tag: task.id });
  } else {
    // fallback: in-page alert
    try { alert(`${title}\n\n${body}`); } catch(e) {}
  }
}

/* Whenever tasks change, re-schedule */
function requestNotificationPermissionAndSchedule(){
  if('Notification' in window && Notification.permission !== 'granted'){
    Notification.requestPermission().then(() => scheduleAllReminders());
  } else {
    scheduleAllReminders();
  }
}

/* Kick scheduling whenever storage or tasks change */
window.addEventListener('focus', () => {
  // reschedule on focus in case timeouts were lost while app was not active
  scheduleAllReminders();
});

/* End */