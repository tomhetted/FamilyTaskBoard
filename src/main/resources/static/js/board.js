/* ===================== board.js ===================== */
/* Календарь + неделя + модалка для создания/редактирования задач (интеграция с /api) */

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

// cache for household and members
let boardHouseholdId = null;
let membersCache = null; // array of {id, name}

// possible statuses
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

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
      let txt = await res.text().catch(()=>null);
      throw new Error(txt || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch(e){
    console.warn("safeFetchJson failed:", url, e);
    throw e;
  }
}

async function fetchBoardDetails(){
  if (!BOARD_ID) return null;
  if (boardHouseholdId !== null) return { householdId: boardHouseholdId };
  try {
    const dto = await safeFetchJson(`/api/boards/${BOARD_ID}`);
    // dto may be BoardDTO with householdId
    boardHouseholdId = dto && dto.householdId ? dto.householdId : null;
    return { householdId: boardHouseholdId, dto };
  } catch(e){
    console.warn("fetchBoardDetails failed", e);
    boardHouseholdId = null;
    return null;
  }
}

async function fetchMembersForBoard(){
  // try to return cached members
  if (Array.isArray(membersCache)) return membersCache;
  const b = await fetchBoardDetails();
  if (!b || !b.householdId) {
    membersCache = [];
    return membersCache;
  }
  try {
    const list = await safeFetchJson(`/api/members/household/${b.householdId}`);
    membersCache = Array.isArray(list) ? list : [];
    return membersCache;
  } catch(e){
    console.warn("fetchMembersForBoard failed", e);
    membersCache = [];
    return membersCache;
  }
}

async function fetchMonthTasks(boardId, year, month){
  if (!boardId) return [];
  const from = firstDayIso(year, month);
  const to = lastDayIso(year, month);
  const url = `/api/tasks/board/${boardId}/month?from=${from}&to=${to}`;
  return await safeFetchJson(url);
}

async function fetchWeekTasks(boardId, weekStartIso){
  if (!boardId) return [];
  const url = `/api/tasks/board/${boardId}/week?start=${weekStartIso}`;
  return await safeFetchJson(url);
}

async function createTaskRequest(boardId, dateIso, description, memberId = null, status = 'TODO'){
  if (!boardId) throw new Error("Board id is required");
  const payload = { boardId, date: dateIso, description, memberId, status };
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

async function updateTaskRequest(taskId, dateIso, description, memberId, status){
  if (!taskId) throw new Error("taskId required");
  const payload = { boardId: BOARD_ID, date: dateIso, description, memberId, status };
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    throw new Error(txt || `Update failed ${res.status}`);
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

// ---------- modal creation & helpers ----------
function ensureTaskModalExists(){
  if (document.getElementById('taskModal')) return; // already present

  const html = `
  <div class="modal" id="taskModal" style="display:none;">
    <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="tm-title" style="width:420px; max-width:96%;">
      <h3 id="tm-title">Задача</h3>

      <div class="form-row">
        <label>Дата</label>
        <input id="tm-date" type="date" />
      </div>

      <div class="form-row" style="align-items:flex-start;">
        <label>Описание</label>
        <textarea id="tm-desc" rows="3" style="flex:1; padding:8px; font-size:13px; resize:vertical;"></textarea>
      </div>

      <div class="form-row">
        <label>Участник</label>
        <select id="tm-member-select">
          <option value="">(Загрузка...)</option>
        </select>
      </div>

      <div class="form-row">
        <label>Статус</label>
        <select id="tm-status-select">
        </select>
      </div>

      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:10px;">
        <button id="tm-save-btn" class="btn-primary">Сохранить</button>
        <button id="tm-delete-btn" style="background:#f77; color:#fff; border:none; padding:6px 10px; border-radius:6px; display:none;">Удалить</button>
        <button id="tm-cancel-btn">Отмена</button>
      </div>

      <div id="tm-error" style="color:crimson; margin-top:8px; display:none;"></div>
    </div>
  </div>
  `;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  // populate status select
  const statusSel = document.getElementById('tm-status-select');
  STATUSES.forEach(s => {
    const o = document.createElement('option'); o.value = s; o.textContent = s.replace('_',' ');
    statusSel.appendChild(o);
  });

  // bind buttons
  document.getElementById('tm-cancel-btn').addEventListener('click', hideTaskModal);
  document.getElementById('tm-delete-btn').addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.taskId;
    if (!id) return;
    if(!confirm('Удалить задачу?')) return;
    try {
      await deleteTask(id);
      hideTaskModal();
      await renderMonth(currentYear, currentMonth);
      await renderWeek();
    } catch(err){
      showTaskError(err.message || err);
    }
  });
  document.getElementById('tm-save-btn').addEventListener('click', async (e) => {
    try {
      await submitTaskModal();
    } catch(err){
      showTaskError(err.message || err);
    }
  });

  // close modal by clicking backdrop
  const modal = document.getElementById('taskModal');
  modal.addEventListener('click', (ev) => {
    if (ev.target === modal) hideTaskModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTaskModal(); });
}

function showTaskError(msg){
  const el = document.getElementById('tm-error');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = msg;
}

function hideTaskError(){
  const el = document.getElementById('tm-error');
  if (!el) return;
  el.style.display = 'none';
  el.textContent = '';
}

async function populateMemberSelect(){
  const sel = document.getElementById('tm-member-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">(нет)</option>';
  const members = await fetchMembersForBoard();
  members.forEach(m => {
    const o = document.createElement('option'); o.value = m.id; o.textContent = m.name; sel.appendChild(o);
  });
}

async function openTaskModal({ mode = 'create', dateIso = null, task = null } = {}){
  ensureTaskModalExists();
  hideTaskError();

  // ensure members loaded
  try { await fetchMembersForBoard(); } catch(e){ /* ignore */ }

  const modal = document.getElementById('taskModal');
  const dateEl = document.getElementById('tm-date');
  const descEl = document.getElementById('tm-desc');
  const memberSel = document.getElementById('tm-member-select');
  const statusSel = document.getElementById('tm-status-select');
  const deleteBtn = document.getElementById('tm-delete-btn');
  const saveBtn = document.getElementById('tm-save-btn');

  // fill member select
  await populateMemberSelect();

  if (mode === 'create') {
    // reset fields
    deleteBtn.style.display = 'none';
    deleteBtn.dataset.taskId = '';
    saveBtn.dataset.mode = 'create';
    saveBtn.dataset.taskId = '';

    if (dateIso) {
      // yyyy-mm-dd -> set to input
      dateEl.value = dateIso;
    } else {
      const today = new Date();
      dateEl.value = formatIso(today);
    }
    descEl.value = '';
    // select none by default
    memberSel.value = '';
    statusSel.value = 'TODO';
    document.getElementById('tm-title').textContent = 'Новая задача';
  } else {
    // edit
    if (!task) {
      showTaskError('Нет данных задачи для редактирования');
      return;
    }
    deleteBtn.style.display = 'inline-block';
    deleteBtn.dataset.taskId = task.id;
    saveBtn.dataset.mode = 'edit';
    saveBtn.dataset.taskId = task.id;

    dateEl.value = task.date || '';
    descEl.value = task.description || '';
    memberSel.value = task.memberId ? String(task.memberId) : '';
    statusSel.value = task.status || 'TODO';
    document.getElementById('tm-title').textContent = 'Редактировать задачу';
  }

  modal.style.display = 'flex';
  // focus desc
  setTimeout(()=> descEl.focus(), 80);
}

function hideTaskModal(){
  const modal = document.getElementById('taskModal');
  if (modal) modal.style.display = 'none';
  hideTaskError();
}

// submit handler used for both create and edit
async function submitTaskModal(){
  const saveBtn = document.getElementById('tm-save-btn');
  const mode = saveBtn.dataset.mode || 'create';
  const taskId = saveBtn.dataset.taskId;
  const date = document.getElementById('tm-date').value;
  const desc = document.getElementById('tm-desc').value && document.getElementById('tm-desc').value.trim();
  const memberVal = document.getElementById('tm-member-select').value;
  const memberId = memberVal ? parseInt(memberVal, 10) : null;
  const status = document.getElementById('tm-status-select').value || 'TODO';

  if (!date) return showTaskError('Укажите дату');
  if (!desc) return showTaskError('Введите описание');

  try {
    if (mode === 'create') {
      if (!BOARD_ID) throw new Error('Доска не задана');
      await createTaskRequest(BOARD_ID, date, desc, memberId, status);
    } else {
      if (!taskId) throw new Error('Id задачи отсутствует');
      await updateTaskRequest(taskId, date, desc, memberId, status);
    }
    hideTaskModal();
    await renderMonth(currentYear, currentMonth);
    await renderWeek();
  } catch(err){
    showTaskError(err.message || String(err));
  }
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
      if (t.memberId) tdiv.dataset.memberId = t.memberId;
      if (t.status) tdiv.dataset.status = t.status;
      if (t.date) tdiv.dataset.date = t.date;
      // left click -> edit modal
      tdiv.addEventListener('click', (ev) => {
        ev.preventDefault();
        const taskObj = {
          id: t.id,
          date: t.date,
          description: t.description,
          memberId: t.memberId,
          status: t.status
        };
        openTaskModal({ mode:'edit', task: taskObj }).catch(e => console.warn(e));
      });
      // right-click -> delete
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
    cell.appendChild(tasksDiv);

    // add button (opens modal) — replaced input+submit with single button
    const actions = document.createElement('div');
    actions.className = 'add-action';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-add-task';
    addBtn.textContent = 'Добавить задачу';
    addBtn.setAttribute('aria-label', `Добавить задачу ${iso}`);
    addBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        await fetchBoardDetails(); // ensure householdId for members
        // open modal in create mode with prefilled date
        await openTaskModal({ mode:'create', dateIso: iso });
      } catch(err){
        alert('Ошибка: ' + (err.message || err));
      }
    });
    actions.appendChild(addBtn);
    cell.appendChild(actions);

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
      if (t.memberId) tdiv.dataset.memberId = t.memberId;
      if (t.status) tdiv.dataset.status = t.status;
      if (t.date) tdiv.dataset.date = t.date;

      tdiv.addEventListener('click', (ev) => {
        ev.preventDefault();
        const taskObj = {
          id: t.id,
          date: t.date,
          description: t.description,
          memberId: t.memberId,
          status: t.status
        };
        openTaskModal({ mode:'edit', task: taskObj }).catch(e => console.warn(e));
      });

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

    // add button -> modal create (no input)
    const actions = document.createElement('div');
    actions.className = 'add-action';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-add-task';
    addBtn.textContent = 'Добавить задачу';
    addBtn.setAttribute('aria-label', `Добавить задачу ${iso}`);
    addBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        await fetchBoardDetails();
        await openTaskModal({ mode:'create', dateIso: iso });
      } catch(err){
        alert('Ошибка: ' + (err.message || err));
      }
    });
    actions.appendChild(addBtn);
    div.appendChild(actions);

    weekContainer.appendChild(div);
  }
}

// ---------- navigation ----------
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
if (prevBtn) prevBtn.addEventListener('click', async ()=>{ currentMonth--; if (currentMonth < 1) { currentMonth = 12; currentYear--; } await renderMonth(currentYear, currentMonth); });
if (nextBtn) nextBtn.addEventListener('click', async ()=>{ currentMonth++; if (currentMonth > 12) { currentMonth = 1; currentYear++; } await renderMonth(currentYear, currentMonth); });

// ---------- modal & setup (board create modal is unchanged) ----------
function showCreateBoardModal(event){
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
    if (err) { err.style.display = 'block'; err.textContent = e.message || 'Ошибка'; }
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
  // hide createBoard modal if visible before JS
  const modal = document.getElementById('createBoardModal'); if (modal) modal.style.display = 'none';

  const openBtn = document.getElementById('openCreateBoard');
  const cancelBtn = document.getElementById('cb-cancel-btn');
  const createBtn = document.getElementById('cb-create-btn');

  if (openBtn) openBtn.addEventListener('click', (e)=> showCreateBoardModal(e));
  if (cancelBtn) cancelBtn.addEventListener('click', hideCreateBoardModal);
  if (createBtn) createBtn.addEventListener('click', submitCreateBoard);

  // ensure task modal exists early (but hidden). We'll populate members on open.
  ensureTaskModalExists();
});

// initial render
renderMonth(currentYear, currentMonth).catch(e=>console.warn('initial render month err', e));
renderWeek().catch(e=>console.warn('initial render week err', e));

/* ===================== /board.js ===================== */
