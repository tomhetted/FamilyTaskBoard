// board.js — устойчивый рендер месяца и недели, безопасно читает параметры из data-атрибутов

function pad(n){ return n < 10 ? '0' + n : '' + n; }
function toIso(date){ return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }

async function safeFetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn('fetch failed', url, e);
    return [];
  }
}

async function fetchMonthTasks(boardId, year, month){
  if (!boardId) return [];
  return await safeFetchJson(`/api/tasks/board/${boardId}/month?year=${year}&month=${month}`);
}

async function fetchWeekTasks(boardId, weekStartIso){
  if (!boardId) return [];
  return await safeFetchJson(`/api/tasks/board/${boardId}/week?start=${weekStartIso}`);
}

// Создаем задачу: контроллер ожидает JSON TaskDTO { boardId, date, description, memberId }
async function createTask(boardId, dateIso, desc){
  if (!boardId) { alert('Board not specified'); return null; }
  try {
    const payload = {
      boardId: boardId,
      date: dateIso,
      description: desc,
      memberId: null
    };
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.warn('Create task failed', res.status);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('Create task error', e);
    return null;
  }
}

function buildMonthDays(year, month){
  const first = new Date(year, month-1, 1);
  const last = new Date(year, month, 0);
  const days = [];
  const firstWeekday = (first.getDay() + 6) % 7; // 0 = Monday
  for(let i=0;i<firstWeekday;i++) days.push(null);
  for(let d=1; d<= last.getDate(); d++) days.push(new Date(year, month-1, d));
  while(days.length % 7 !== 0) days.push(null);
  return days;
}

function renderHeaderTitle(boardTitle, year, month) {
  const h1 = document.getElementById('pageTitle');
  if (h1) h1.textContent = `${boardTitle} ${year}-${month}`;
  const lbl = document.getElementById('currentMonthLabel');
  if (lbl) lbl.textContent = `${year}-${pad(month)}`;
}

async function renderMonthGrid(tasks, YEAR, MONTH, BOARD_ID) {
  const grid = document.getElementById('monthGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const days = buildMonthDays(YEAR, MONTH);
  const tasksByDate = {};
  tasks.forEach(t => {
    tasksByDate[t.date] = tasksByDate[t.date] || [];
    tasksByDate[t.date].push(t);
  });

  days.forEach(dt => {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (dt === null) {
      cell.style.background = '#f0f0f0';
      grid.appendChild(cell);
      return;
    }
    const iso = toIso(dt);
    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `<span>${dt.getDate()}</span><span class="small">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(dt.getDay()+6)%7]}</span>`;
    cell.appendChild(header);

    const tasksDiv = document.createElement('div');
    tasksDiv.className = 'tasks';
    (tasksByDate[iso] || []).forEach(t => {
      const tdiv = document.createElement('div');
      tdiv.className = 'task';
      tdiv.textContent = (t.memberName ? '['+t.memberName+'] ' : '') + t.description;
      tasksDiv.appendChild(tdiv);
    });
    cell.appendChild(tasksDiv);

    const form = document.createElement('div');
    form.className = 'add-form';
    const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Добавить...';
    const btn = document.createElement('button'); btn.type='button'; btn.textContent = '+';
    btn.addEventListener('click', async () => {
      const desc = input.value && input.value.trim();
      if (!desc) return alert('Введите описание');
      const created = await createTask(BOARD_ID, iso, desc);
      if (created) loadAndRender(BOARD_ID); else alert('Ошибка при создании');
    });
    form.appendChild(input); form.appendChild(btn);
    cell.appendChild(form);

    grid.appendChild(cell);
  });
}

async function renderWeek(weekStartDate, BOARD_ID) {
  const weekContainer = document.getElementById('weekContainer');
  if (!weekContainer) return;
  weekContainer.innerHTML = '';
  const iso = toIso(weekStartDate);
  const tasks = await fetchWeekTasks(BOARD_ID, iso);
  const map = {};
  tasks.forEach(t => { (map[t.date] = map[t.date] || []).push(t); });

  for(let i=0;i<7;i++){
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    const div = document.createElement('div');
    div.className = 'week-day';
    div.innerHTML = `<div class="day-header">${d.toLocaleDateString()} <span class="small">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(d.getDay()+6)%7]}</span></div>`;
    const list = map[toIso(d)] || [];
    list.forEach(t => {
      const tdiv = document.createElement('div');
      tdiv.className = 'task';
      tdiv.textContent = (t.memberName ? '['+t.memberName+'] ' : '') + t.description;
      div.appendChild(tdiv);
    });

    // add form for week-day
    const form = document.createElement('div');
    form.className = 'add-form';
    const input = document.createElement('input'); input.type='text'; input.placeholder='Добавить...';
    const btn = document.createElement('button'); btn.type='button'; btn.textContent = '+';
    const dayIso = toIso(d);
    btn.addEventListener('click', async () => {
      const desc = input.value && input.value.trim();
      if (!desc) return alert('Введите описание');
      const created = await createTask(BOARD_ID, dayIso, desc);
      if (created) loadAndRender(BOARD_ID); else alert('Ошибка при создании');
    });
    form.appendChild(input); form.appendChild(btn);
    div.appendChild(form);

    weekContainer.appendChild(div);
  }
}

async function loadAndRender(BOARD_ID) {
  // прочитаем YEAR/MONTH из DOM каждый раз (вдруг изменились)
  const boardEl = document.getElementById('boardData');
  let YEAR = parseInt(boardEl.dataset.year) || (new Date()).getFullYear();
  let MONTH = parseInt(boardEl.dataset.month) || ((new Date()).getMonth() + 1);
  let TITLE = boardEl.dataset.title || 'TaskBoard';

  renderHeaderTitle(TITLE, YEAR, MONTH);

  const monthTasks = await fetchMonthTasks(BOARD_ID, YEAR, MONTH);
  await renderMonthGrid(monthTasks, YEAR, MONTH, BOARD_ID);

  // current week: Monday of today
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const monday = new Date(today); monday.setDate(today.getDate() - weekday);
  await renderWeek(monday, BOARD_ID);
}

document.addEventListener('DOMContentLoaded', () => {
  const boardEl = document.getElementById('boardData');
  const BOARD_ID = parseInt(boardEl.dataset.boardId) || 0;
  const YEAR_INIT = parseInt(boardEl.dataset.year) || (new Date()).getFullYear();
  const MONTH_INIT = parseInt(boardEl.dataset.month) || ((new Date()).getMonth() + 1);
  const TITLE_INIT = boardEl.dataset.title || 'TaskBoard';

  // начальный заголовок
  renderHeaderTitle(TITLE_INIT, YEAR_INIT, MONTH_INIT);

  // кнопки навигации
  const prev = document.getElementById('prevMonth');
  const next = document.getElementById('nextMonth');

  // хранить текущие значения локально чтобы prev/next меняли их
  let currentYear = YEAR_INIT;
  let currentMonth = MONTH_INIT;

  prev.addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    // обновим dataset на элементе — чтобы loadAndRender читал актуальные
    boardEl.dataset.year = currentYear;
    boardEl.dataset.month = currentMonth;
    await loadAndRender(BOARD_ID);
  });

  next.addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    boardEl.dataset.year = currentYear;
    boardEl.dataset.month = currentMonth;
    await loadAndRender(BOARD_ID);
  });

  // initial load
  loadAndRender(BOARD_ID);
});
