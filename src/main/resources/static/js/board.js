/* ===================== board.js ===================== */
/* Календарь + неделя + создание/удаление задач (интеграция с /api) */

const boardData = document.getElementById("boardData");
const BOARD_ID = boardData ? parseInt(boardData.dataset.boardId, 10) : 0;
const initialYear = boardData ? parseInt(boardData.dataset.year, 10) : NaN;
const initialMonth = boardData ? parseInt(boardData.dataset.month, 10) : NaN;

const monthGrid = document.getElementById("monthGrid");
const weekContainer = document.getElementById("weekContainer");
const currentMonthLabel = document.getElementById("currentMonthLabel");
const weekdayRow = document.getElementById("weekdayRow");

let currentYear = Number.isFinite(initialYear) ? initialYear : (new Date()).getFullYear();
let currentMonth = Number.isFinite(initialMonth) ? initialMonth : ((new Date()).getMonth() + 1);

// ---------- helpers ----------
function pad(n){ return n < 10 ? '0' + n : '' + n; }
function formatIso(date) {
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}
function formatIsoFromYMD(y,m,d){
  return `${String(y).padStart(4,'0')}-${pad(m)}-${pad(d)}`;
}
function getDaysInMonth(y,m){ return new Date(y, m, 0).getDate(); }
function firstDayIso(y,m){ return formatIsoFromYMD(y, m, 1); }
function lastDayIso(y,m){ return formatIsoFromYMD(y, m, getDaysInMonth(y,m)); }
function mondayOf(date){
  // возвращает Date для понедельника той недели
  const d = new Date(date);
  const weekday = (d.getDay() + 6) % 7; // 0=Mon
  d.setDate(d.getDate() - weekday);
  d.setHours(0,0,0,0);
  return d;
}

// ---------- network ----------
async function safeFetchJson(url, opts){
  try{
    const res = await fetch(url, opts);
    if (!res.ok) {
      // try parse body if possible for debugging
      let txt = await res.text().catch(()=>null);
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch(e){
    console.warn("safeFetchJson failed:", url, e);
    throw e;
  }
}

async function fetchMonthTasks(boardId, year, month){
  if (!boardId) return [];
  const from = firstDayIso(year, month);
  const to = lastDayIso(year, month);
  // backend: GET /api/tasks/board/{boardId}/month?from=yyyy-MM-dd&to=yyyy-MM-dd
  const url = `/api/tasks/board/${boardId}/month?from=${from}&to=${to}`;
  return await safeFetchJson(url);
}

async function fetchWeekTasks(boardId, weekStartIso){
  if (!boardId) return [];
  const url = `/api/tasks/board/${boardId}/week?start=${weekStartIso}`;
  return await safeFetchJson(url);
}

async function createTask(boardId, dateIso, description){
  if (!boardId) throw new Error("Board id is required");
  const payload = { boardId, date: dateIso, description, memberId: null };
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    throw new Error(txt || `Create failed ${res.status}`);
  }
  return await res.json();
}

async function deleteTask(taskId){
  const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    throw new Error(txt || `Delete failed ${res.status}`);
  }
  return true;
}

// ---------- rendering ----------
function renderWeekdayHeader(){
  if (!weekdayRow) return;
  const names = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  weekdayRow.innerHTML = '';
  names.forEach(n=>{
    const el = document.createElement('div');
    el.className = 'weekday';
    el.textContent = n;
    weekdayRow.appendChild(el);
  });
}

async function renderMonth(year, month){
  if (!monthGrid) return;
  renderWeekdayHeader();
  monthGrid.innerHTML = '';
  const first = new Date(year, month-1, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // 0=Mon
  // placeholders
  for(let i=0;i<firstWeekday;i++){
    const e = document.createElement('div'); e.className='day-cell empty'; monthGrid.appendChild(e);
  }

  const days = getDaysInMonth(year, month);
  // load tasks
  let tasks = [];
  try { tasks = await fetchMonthTasks(BOARD_ID, year, month); } catch(e) { console.warn("month tasks load error", e); }

  const tasksByDate = {};
  if (Array.isArray(tasks)) tasks.forEach(t => { if (t && t.date) (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t); });

  if (currentMonthLabel) currentMonthLabel.textContent = `${year}-${String(month).padStart(2,'0')}`;

  for(let d=1; d<=days; d++){
    const iso = formatIsoFromYMD(year, month, d);
    const cell = document.createElement('div'); cell.className='day-cell';
    // header
    const header = document.createElement('div'); header.className='day-header';
    header.innerHTML = `<span>${d}</span><span class="small">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(new Date(year, month-1, d).getDay()+6)%7]}</span>`;
    cell.appendChild(header);

    // tasks area
    const tasksDiv = document.createElement('div'); tasksDiv.className='tasks';
    (tasksByDate[iso] || []).forEach(t => {
      const tdiv = document.createElement('div');
      tdiv.className='task';
      tdiv.textContent = (t.memberName ? '['+t.memberName+'] ' : '') + t.description;
      if (t.id) tdiv.dataset.taskId = t.id;
      // add delete on right-click
      tdiv.addEventListener('contextmenu', async (ev) => {
        ev.preventDefault();
        if (!confirm('Удалить задачу?')) return;
        try {
          await deleteTask(t.id);
          await renderMonth(currentYear, currentMonth);
          await renderWeek(); // обновим правую колонку
        } catch(err){ alert('Ошибка удаления: ' + (err.message || err)); }
      });
      tasksDiv.appendChild(tdiv);
    });
    cell.appendChild(tasksDiv);

    // add form
    const form = document.createElement('form'); form.className='add-form';
    const input = document.createElement('input'); input.type='text'; input.placeholder='Новая задача...';
    const btn = document.createElement('button'); btn.type='submit'; btn.textContent = '+';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const desc = input.value && input.value.trim();
      if (!desc) return alert('Введите описание задачи');
      try {
        const created = await createTask(BOARD_ID, iso, desc);
        input.value = '';
        await renderMonth(currentYear, currentMonth);
        await renderWeek();
      } catch(err){
        alert('Ошибка создания: ' + (err.message || err));
      }
    });

    cell.appendChild(form);
    monthGrid.appendChild(cell);
  }

  // fill to full weeks
  while(monthGrid.childElementCount % 7 !== 0){
    const e = document.createElement('div'); e.className='day-cell empty'; monthGrid.appendChild(e);
  }
}

async function renderWeek(){
  if (!weekContainer) return;
  weekContainer.innerHTML = '';
  const today = new Date();
  const mon = mondayOf(today);

  // load tasks for week start
  const startIso = formatIso(mon);
  let tasks = [];
  try { tasks = await fetchWeekTasks(BOARD_ID, startIso); } catch(e){ console.warn('week fetch err', e); }
  const map = {};
  if (Array.isArray(tasks)) tasks.forEach(t => { (map[t.date] = map[t.date] || []).push(t); });

  for(let i=0;i<7;i++){
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const iso = formatIso(d);
    const div = document.createElement('div'); div.className='week-day';
    const header = document.createElement('div'); header.className='day-header';
    header.textContent = `${d.toLocaleDateString('ru-RU', {weekday:'short'})} ${d.getDate()}`;
    div.appendChild(header);

    const tasksDiv = document.createElement('div'); tasksDiv.className='tasks';
    (map[iso] || []).forEach(t => {
      const tdiv = document.createElement('div'); tdiv.className='task';
      tdiv.textContent = (t.memberName ? '['+t.memberName+'] ' : '') + t.description;
      if (t.id) tdiv.dataset.taskId = t.id;
      tdiv.addEventListener('contextmenu', async (ev) => {
        ev.preventDefault();
        if (!confirm('Удалить задачу?')) return;
        try {
          await deleteTask(t.id);
          await renderMonth(currentYear, currentMonth);
          await renderWeek();
        } catch(err){ alert('Ошибка удаления: ' + (err.message || err)); }
      });
      tasksDiv.appendChild(tdiv);
    });
    div.appendChild(tasksDiv);

    // add form
    const form = document.createElement('form'); form.className='add-form';
    const input = document.createElement('input'); input.type='text'; input.placeholder='Добавить...';
    const btn = document.createElement('button'); btn.type='submit'; btn.textContent = '+';
    form.appendChild(input); form.appendChild(btn);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const desc = input.value && input.value.trim();
      if (!desc) return alert('Введите описание');
      try {
        await createTask(BOARD_ID, iso, desc);
        input.value = '';
        await renderMonth(currentYear, currentMonth);
        await renderWeek();
      } catch(err){ alert('Ошибка создания: ' + (err.message || err)); }
    });

    div.appendChild(form);
    weekContainer.appendChild(div);
  }
}

// ---------- navigation ----------
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
if (prevBtn) prevBtn.addEventListener('click', async ()=>{
  currentMonth--; if (currentMonth < 1) { currentMonth = 12; currentYear--; }
  await renderMonth(currentYear, currentMonth);
});
if (nextBtn) nextBtn.addEventListener('click', async ()=>{
  currentMonth++; if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  await renderMonth(currentYear, currentMonth);
});

// ---------- modal & setup ----------
function showCreateBoardModal(event){
  // allow only real user interaction
  if (!(event && event.isTrusted)) return;
  const modal = document.getElementById('createBoardModal');
  if (!modal) return;
  modal.style.display = 'flex';
  setTimeout(()=>loadHouseholdsIntoSelect().catch(e=>console.warn(e)), 40);
}
function hideCreateBoardModal(){ const m=document.getElementById('createBoardModal'); if(m) m.style.display='none'; }

async function loadHouseholdsIntoSelect(){
  const sel = document.getElementById('cb-household-select');
  const newRow = document.getElementById('cb-new-household-row');
  if (!sel) return;
  sel.innerHTML = '<option value="">(Загрузка...)</option>';
  let list = [];
  try { list = await safeFetchJson('/api/households'); } catch(e){ sel.innerHTML = "<option value=''>Ошибка</option>"; return; }
  sel.innerHTML = '';
  if (Array.isArray(list) && list.length){
    list.forEach(h => {
      const o = document.createElement('option'); o.value = h.id; o.textContent = h.name; sel.appendChild(o);
    });
  } else {
    const o = document.createElement('option'); o.value=''; o.textContent='(Нет домохозяйств)'; sel.appendChild(o);
  }
  const optNew = document.createElement('option'); optNew.value='new'; optNew.textContent='Создать новое домохозяйство...'; sel.appendChild(optNew);
  sel.onchange = null;
  sel.addEventListener('change', ()=>{ if (sel.value==='new') newRow.style.display='block'; else newRow.style.display='none'; });
}

async function submitCreateBoard(){
  const titleEl = document.getElementById('cb-title');
  const yearEl  = document.getElementById('cb-year');
  const monthEl = document.getElementById('cb-month');
  const sel = document.getElementById('cb-household-select');
  const newHouseEl = document.getElementById('cb-new-household-name');
  const err = document.getElementById('cb-error');

  err && (err.style.display='none');
  try {
    if (!yearEl || !monthEl) throw new Error('Внутренняя ошибка формы');
    const y = parseInt(yearEl.value,10), m = parseInt(monthEl.value,10);
    if (!y || !m) throw new Error('Укажите год и месяц');
    let householdId = null;
    if (!sel) throw new Error('Выберите домохозяйство');
    if (sel.value === 'new') {
      const name = newHouseEl && newHouseEl.value.trim();
      if (!name) throw new Error('Введите название нового домохозяйства');
      const created = await createHousehold(name);
      householdId = created.id;
    } else if (sel.value) {
      householdId = parseInt(sel.value, 10);
    } else throw new Error('Выберите домохозяйство');
    const payload = { title: titleEl ? titleEl.value.trim() : `Board ${m}/${y}`, year: y, month: m, householdId };
    const createdBoard = await createBoardRequest(payload);
    if (createdBoard && createdBoard.id) window.location.href = `/boards/${createdBoard.id}`;
    else throw new Error('Пустой ответ сервера');
  } catch(e){
    if (err) { err.style.display='block'; err.textContent = e.message || 'Ошибка'; }
    console.warn('submitCreateBoard error', e);
  }
}

async function createHousehold(name){
  const res = await fetch('/api/households', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name})});
  if (!res.ok) { const txt = await res.text().catch(()=>null); throw new Error(txt || `HTTP ${res.status}`); }
  return await res.json();
}
async function createBoardRequest(payload){
  const res = await fetch('/api/boards', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
  if (!res.ok) { const txt = await res.text().catch(()=>null); throw new Error(txt || `HTTP ${res.status}`); }
  return await res.json();
}

// bind
document.addEventListener('DOMContentLoaded', ()=>{
  // hide modal if visible before JS
  const modal = document.getElementById('createBoardModal'); if (modal) modal.style.display = 'none';

  const openBtn = document.getElementById('openCreateBoard');
  const cancelBtn = document.getElementById('cb-cancel-btn');
  const createBtn = document.getElementById('cb-create-btn');

  if (openBtn) openBtn.addEventListener('click', (e)=> showCreateBoardModal(e));
  if (cancelBtn) cancelBtn.addEventListener('click', hideCreateBoardModal);
  if (createBtn) createBtn.addEventListener('click', submitCreateBoard);
});

// initial render
renderMonth(currentYear, currentMonth).catch(e=>console.warn('initial render month err', e));
renderWeek().catch(e=>console.warn('initial render week err', e));

/* ===================== /board.js ===================== */
