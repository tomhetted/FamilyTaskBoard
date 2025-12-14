/* ===================== board.js ===================== */
/* Календарь + неделя + модалки для создания/редактирования задач */

const boardData = document.getElementById("boardData");
const BOARD_ID = boardData ? parseInt(boardData.dataset.boardId, 10) : 0;
const initialYear = boardData ? parseInt(boardData.dataset.year, 10) : NaN;
const initialMonth = boardData ? parseInt(boardData.dataset.month, 10) : NaN;

const monthGrid = document.getElementById("monthGrid");
const weekContainer = document.getElementById("weekContainer");
const currentMonthLabel = document.getElementById("currentMonthLabel");
const weekdayRow = document.getElementById("weekdayRow");

// При открытии страницы доски показываем ТЕКУЩИЙ месяц по умолчанию.
const nowInit = new Date();
let currentYear = nowInit.getFullYear();
let currentMonth = nowInit.getMonth() + 1; // 1..12

// cache for household and members
let boardHouseholdId = null;
let membersCache = null; // array of {id, name}

// backend status keys
const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

// Типы задач
const TASK_TYPES = {
    REGULAR: 'REGULAR',
    ROUTINE: 'ROUTINE'
};

// mapping backend -> user friendly labels
const STATUS_LABELS = {
    'TODO': 'Сделать',
    'IN_PROGRESS': 'В прогрессе',
    'DONE': 'Готово'
};

// русские имена месяцев (для заголовка)
const MONTH_NAMES = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];

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

// mondayOf: возвращает дату понедельника той же недели
function mondayOf(date){
    const d = new Date(date);
    const weekday = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
    d.setDate(d.getDate() - weekday);
    d.setHours(0,0,0,0);
    return d;
}

// класс для статуса (normalized): 'task--todo' / 'task--in-progress' / 'task--done'
function statusClass(status) {
    if (!status) return '';
    return 'task--' + String(status).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// обновить заголовок страницы: "<title> на <месяц>"
function updatePageTitle(year, month){
    const pageTitleEl = document.getElementById('pageTitle');
    const titleFromData = boardData ? (boardData.dataset.title || '') : '';
    const titleText = titleFromData && titleFromData.trim() ? titleFromData.trim() : 'TaskBoard';
    const monthName = MONTH_NAMES[(month - 1 + 12) % 12];
    if (pageTitleEl) pageTitleEl.textContent = `${titleText} на ${monthName}`;
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
        boardHouseholdId = dto && dto.householdId ? dto.householdId : null;
        return { householdId: boardHouseholdId, dto };
    } catch(e){
        console.warn("fetchBoardDetails failed", e);
        boardHouseholdId = null;
        return null;
    }
}

async function fetchMembersForBoard(){
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

async function createTaskRequest(boardId, dateIso, description, memberId = null, status = 'TODO', taskType = 'REGULAR', weekDay = null){
    if (!boardId) throw new Error("Board id is required");

    const payload = {
        boardId,
        description,
        memberId,
        status,
        taskType
    };

    // Добавляем специфичные поля в зависимости от типа задачи
    if (taskType === TASK_TYPES.ROUTINE) {
        payload.weekDay = weekDay;
    } else {
        payload.date = dateIso;
    }

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

async function updateTaskRequest(taskId, dateIso, description, memberId, status, taskType, weekDay){
    if (!taskId) throw new Error("taskId required");

    const payload = {
        boardId: BOARD_ID,
        description,
        memberId,
        status,
        taskType
    };

    // Добавляем специфичные поля в зависимости от типа задачи
    if (taskType === TASK_TYPES.ROUTINE) {
        payload.weekDay = weekDay;
        payload.date = null;
    } else {
        payload.date = dateIso;
        payload.weekDay = null;
    }

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
function ensureRegularModalExists(){
    if (document.getElementById('regularTaskModal')) return;

    const html = `
    <div class="modal" id="regularTaskModal" style="display:none;">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="regular-tm-title" style="width:450px; max-width:96%;">
            <h3 id="regular-tm-title">Новая задача (в календарь)</h3>

            <div class="form-row">
                <label>Дата</label>
                <input id="regular-tm-date" type="date" />
            </div>

            <div class="form-row" style="align-items:flex-start;">
                <label>Описание</label>
                <textarea id="regular-tm-desc" rows="3" style="flex:1; padding:8px; font-size:13px; resize:vertical;"></textarea>
            </div>

            <div class="form-row">
                <label>Участник</label>
                <select id="regular-tm-member-select">
                    <option value="">(Загрузка...)</option>
                </select>
            </div>

            <div class="form-row">
                <label>Статус</label>
                <select id="regular-tm-status-select">
                </select>
            </div>

            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:10px;">
                <button id="regular-tm-save-btn" class="btn-primary">Сохранить</button>
                <button id="regular-tm-delete-btn" style="background:#f77; color:#fff; border:none; padding:6px 10px; border-radius:6px; display:none;">Удалить</button>
                <button id="regular-tm-cancel-btn">Отмена</button>
            </div>

            <div id="regular-tm-error" style="color:crimson; margin-top:8px; display:none;"></div>
        </div>
    </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    // populate status select
    const statusSel = document.getElementById('regular-tm-status-select');
    statusSel.innerHTML = '';
    STATUSES.forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = STATUS_LABELS[s] || s;
        statusSel.appendChild(o);
    });

    // bind buttons
    document.getElementById('regular-tm-cancel-btn').addEventListener('click', () => hideModal('regularTaskModal'));
    document.getElementById('regular-tm-delete-btn').addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.taskId;
        if (!id) return;
        if(!confirm('Удалить задачу?')) return;
        try {
            await deleteTask(id);
            hideModal('regularTaskModal');
            await renderMonth(currentYear, currentMonth);
            await renderWeek();
        } catch(err){
            showModalError('regular-tm-error', err.message || err);
        }
    });
    document.getElementById('regular-tm-save-btn').addEventListener('click', async (e) => {
        try {
            await submitRegularTaskModal();
        } catch(err){
            showModalError('regular-tm-error', err.message || err);
        }
    });

    // close modal by clicking backdrop
    const modal = document.getElementById('regularTaskModal');
    modal.addEventListener('click', (ev) => {
        if (ev.target === modal) hideModal('regularTaskModal');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal('regularTaskModal');
    });
}

function ensureRoutineModalExists(){
    if (document.getElementById('routineTaskModal')) return;

    const html = `
    <div class="modal" id="routineTaskModal" style="display:none;">
        <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="routine-tm-title" style="width:450px; max-width:96%;">
            <h3 id="routine-tm-title">Новая рутинная задача (в неделю)</h3>

            <div class="form-row">
                <label>День недели</label>
                <select id="routine-tm-weekday" class="form-control">
                    <option value="1">Понедельник</option>
                    <option value="2">Вторник</option>
                    <option value="3">Среда</option>
                    <option value="4">Четверг</option>
                    <option value="5">Пятница</option>
                    <option value="6">Суббота</option>
                    <option value="7">Воскресенье</option>
                </select>
                <div class="form-hint">Задача будет появляться каждый выбранный день недели</div>
            </div>

            <div class="form-row" style="align-items:flex-start;">
                <label>Описание</label>
                <textarea id="routine-tm-desc" rows="3" style="flex:1; padding:8px; font-size:13px; resize:vertical;"></textarea>
            </div>

            <div class="form-row">
                <label>Участник</label>
                <select id="routine-tm-member-select">
                    <option value="">(Загрузка...)</option>
                </select>
            </div>

            <div class="form-row">
                <label>Статус</label>
                <select id="routine-tm-status-select">
                </select>
            </div>

            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:10px;">
                <button id="routine-tm-save-btn" class="btn-primary">Сохранить</button>
                <button id="routine-tm-delete-btn" style="background:#f77; color:#fff; border:none; padding:6px 10px; border-radius:6px; display:none;">Удалить</button>
                <button id="routine-tm-cancel-btn">Отмена</button>
            </div>

            <div id="routine-tm-error" style="color:crimson; margin-top:8px; display:none;"></div>
        </div>
    </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    // populate status select
    const statusSel = document.getElementById('routine-tm-status-select');
    statusSel.innerHTML = '';
    STATUSES.forEach(s => {
        const o = document.createElement('option');
        o.value = s;
        o.textContent = STATUS_LABELS[s] || s;
        statusSel.appendChild(o);
    });

    // bind buttons
    document.getElementById('routine-tm-cancel-btn').addEventListener('click', () => hideModal('routineTaskModal'));
    document.getElementById('routine-tm-delete-btn').addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.taskId;
        if (!id) return;
        if(!confirm('Удалить задачу?')) return;
        try {
            await deleteTask(id);
            hideModal('routineTaskModal');
            await renderMonth(currentYear, currentMonth);
            await renderWeek();
        } catch(err){
            showModalError('routine-tm-error', err.message || err);
        }
    });
    document.getElementById('routine-tm-save-btn').addEventListener('click', async (e) => {
        try {
            await submitRoutineTaskModal();
        } catch(err){
            showModalError('routine-tm-error', err.message || err);
        }
    });

    // close modal by clicking backdrop
    const modal = document.getElementById('routineTaskModal');
    modal.addEventListener('click', (ev) => {
        if (ev.target === modal) hideModal('routineTaskModal');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal('routineTaskModal');
    });
}

function ensureModalsExist() {
    ensureRegularModalExists();
    ensureRoutineModalExists();
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    hideAllModalErrors();
}

function hideAllModalErrors() {
    const errors = ['regular-tm-error', 'routine-tm-error'];
    errors.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.textContent = '';
        }
    });
}

function showModalError(errorElementId, msg) {
    const el = document.getElementById(errorElementId);
    if (!el) return;
    el.style.display = 'block';
    el.textContent = msg;
}

async function populateMemberSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">(нет)</option>';
    const members = await fetchMembersForBoard();
    members.forEach(m => {
        const o = document.createElement('option');
        o.value = m.id;
        o.textContent = m.name;
        sel.appendChild(o);
    });
}

// ---------- Open modal functions ----------
async function openRegularTaskModal({ mode = 'create', dateIso = null, task = null } = {}) {
    ensureModalsExist();
    hideAllModalErrors();

    // ensure members loaded
    try { await fetchMembersForBoard(); } catch(e){ /* ignore */ }

    const modal = document.getElementById('regularTaskModal');
    const dateEl = document.getElementById('regular-tm-date');
    const descEl = document.getElementById('regular-tm-desc');
    const memberSel = document.getElementById('regular-tm-member-select');
    const statusSel = document.getElementById('regular-tm-status-select');
    const deleteBtn = document.getElementById('regular-tm-delete-btn');
    const saveBtn = document.getElementById('regular-tm-save-btn');

    // fill member select
    await populateMemberSelect('regular-tm-member-select');

    if (mode === 'create') {
        deleteBtn.style.display = 'none';
        deleteBtn.dataset.taskId = '';
        saveBtn.dataset.mode = 'create';
        saveBtn.dataset.taskId = '';

        if (dateIso) {
            dateEl.value = dateIso;
        } else {
            const today = new Date();
            dateEl.value = formatIso(today);
        }

        descEl.value = '';
        memberSel.value = '';
        statusSel.value = 'TODO';
        document.getElementById('regular-tm-title').textContent = 'Новая задача (в календарь)';
    } else {
        if (!task) {
            showModalError('regular-tm-error', 'Нет данных задачи для редактирования');
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
        document.getElementById('regular-tm-title').textContent = 'Редактировать задачу';
    }

    modal.style.display = 'flex';
    setTimeout(()=> descEl.focus(), 80);
}

async function openRoutineTaskModal({ mode = 'create', weekDay = null, task = null } = {}) {
    ensureModalsExist();
    hideAllModalErrors();

    // ensure members loaded
    try { await fetchMembersForBoard(); } catch(e){ /* ignore */ }

    const modal = document.getElementById('routineTaskModal');
    const weekdaySelect = document.getElementById('routine-tm-weekday');
    const descEl = document.getElementById('routine-tm-desc');
    const memberSel = document.getElementById('routine-tm-member-select');
    const statusSel = document.getElementById('routine-tm-status-select');
    const deleteBtn = document.getElementById('routine-tm-delete-btn');
    const saveBtn = document.getElementById('routine-tm-save-btn');

    // fill member select
    await populateMemberSelect('routine-tm-member-select');

    if (mode === 'create') {
        deleteBtn.style.display = 'none';
        deleteBtn.dataset.taskId = '';
        saveBtn.dataset.mode = 'create';
        saveBtn.dataset.taskId = '';

        if (weekDay) {
            weekdaySelect.value = String(weekDay);
        } else {
            // Устанавливаем текущий день недели по умолчанию
            const today = new Date();
            const dayOfWeek = today.getDay();
            const defaultWeekDay = dayOfWeek === 0 ? 7 : dayOfWeek;
            weekdaySelect.value = String(defaultWeekDay);
        }

        descEl.value = '';
        memberSel.value = '';
        statusSel.value = 'TODO';
        document.getElementById('routine-tm-title').textContent = 'Новая рутинная задача (в неделю)';
    } else {
        if (!task) {
            showModalError('routine-tm-error', 'Нет данных задачи для редактирования');
            return;
        }
        deleteBtn.style.display = 'inline-block';
        deleteBtn.dataset.taskId = task.id;
        saveBtn.dataset.mode = 'edit';
        saveBtn.dataset.taskId = task.id;

        // При редактировании используем сохраненный weekDay
        weekdaySelect.value = task.weekDay ? String(task.weekDay) : '1';
        descEl.value = task.description || '';
        memberSel.value = task.memberId ? String(task.memberId) : '';
        statusSel.value = task.status || 'TODO';
        document.getElementById('routine-tm-title').textContent = 'Редактировать рутинную задачу';
    }

    modal.style.display = 'flex';
    setTimeout(()=> descEl.focus(), 80);
}

// ---------- Submit modal functions ----------
async function submitRegularTaskModal() {
    const saveBtn = document.getElementById('regular-tm-save-btn');
    const mode = saveBtn.dataset.mode || 'create';
    const taskId = saveBtn.dataset.taskId;

    const date = document.getElementById('regular-tm-date').value;
    const desc = document.getElementById('regular-tm-desc').value && document.getElementById('regular-tm-desc').value.trim();
    const memberVal = document.getElementById('regular-tm-member-select').value;
    const memberId = memberVal ? parseInt(memberVal, 10) : null;
    const status = document.getElementById('regular-tm-status-select').value || 'TODO';

    if (!date) return showModalError('regular-tm-error', 'Укажите дату');
    if (!desc) return showModalError('regular-tm-error', 'Введите описание');

    try {
        if (mode === 'create') {
            if (!BOARD_ID) throw new Error('Доска не задана');
            await createTaskRequest(BOARD_ID, date, desc, memberId, status, TASK_TYPES.REGULAR, null);
        } else {
            if (!taskId) throw new Error('Id задачи отсутствует');
            await updateTaskRequest(taskId, date, desc, memberId, status, TASK_TYPES.REGULAR, null);
        }
        hideModal('regularTaskModal');
        await renderMonth(currentYear, currentMonth);
        await renderWeek();
    } catch(err) {
        showModalError('regular-tm-error', err.message || String(err));
    }
}

async function submitRoutineTaskModal() {
    const saveBtn = document.getElementById('routine-tm-save-btn');
    const mode = saveBtn.dataset.mode || 'create';
    const taskId = saveBtn.dataset.taskId;

    const weekDayVal = document.getElementById('routine-tm-weekday').value;
    const weekDay = weekDayVal ? parseInt(weekDayVal, 10) : null;
    const desc = document.getElementById('routine-tm-desc').value && document.getElementById('routine-tm-desc').value.trim();
    const memberVal = document.getElementById('routine-tm-member-select').value;
    const memberId = memberVal ? parseInt(memberVal, 10) : null;
    const status = document.getElementById('routine-tm-status-select').value || 'TODO';

    if (!weekDay || weekDay < 1 || weekDay > 7) {
        return showModalError('routine-tm-error', 'Для рутинной задачи выберите день недели (1-7)');
    }
    if (!desc) return showModalError('routine-tm-error', 'Введите описание');

    try {
        if (mode === 'create') {
            if (!BOARD_ID) throw new Error('Доска не задана');

            // ВЫЧИСЛЯЕМ ДАТУ НА ОСНОВЕ ТЕКУЩЕЙ НЕДЕЛИ И ВЫБРАННОГО ДНЯ НЕДЕЛИ
            const today = new Date();
            const weekStart = mondayOf(today); // Находим понедельник текущей недели
            const taskDate = new Date(weekStart);
            taskDate.setDate(weekStart.getDate() + (weekDay - 1)); // Добавляем дни до нужного дня недели

            const dateIso = formatIso(taskDate);

            await createTaskRequest(BOARD_ID, dateIso, desc, memberId, status, TASK_TYPES.ROUTINE, weekDay);
        } else {
            if (!taskId) throw new Error('Id задачи отсутствует');
            await updateTaskRequest(taskId, null, desc, memberId, status, TASK_TYPES.ROUTINE, weekDay);
        }
        hideModal('routineTaskModal');
        await renderMonth(currentYear, currentMonth);
        await renderWeek();
    } catch(err) {
        showModalError('routine-tm-error', err.message || String(err));
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
    if (Array.isArray(tasks)) tasks.forEach(t => {
        if (t && t.date) (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t);
    });

    // label and page title: month name + year
    if (currentMonthLabel) currentMonthLabel.textContent = `${MONTH_NAMES[(month-1+12)%12]} ${year}`;
    updatePageTitle(year, month);

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
            tdiv.className = 'task';

            // Добавляем класс типа задачи
            if (t.taskType === TASK_TYPES.ROUTINE) {
                tdiv.classList.add('task--routine');
            } else {
                tdiv.classList.add('task--regular');
            }

            if (t.id) tdiv.dataset.taskId = t.id;
            if (t.memberId) tdiv.dataset.memberId = t.memberId;
            if (t.status) tdiv.dataset.status = t.status;
            if (t.date) tdiv.dataset.date = t.date;
            if (t.taskType) tdiv.dataset.taskType = t.taskType;
            if (t.weekDay) tdiv.dataset.weekDay = t.weekDay;

            // apply status class for color indicator
            const sc = statusClass(t.status);
            if (sc) tdiv.classList.add(sc);

            // description (with type icon and optional member)
            const descSpan = document.createElement('span');
            descSpan.className = 'task-desc';

            const typeIcon = t.taskType === TASK_TYPES.ROUTINE ? '🔄 ' : '📅 ';
            const memberPart = t.memberName ? '['+t.memberName+'] ' : '';
            descSpan.textContent = typeIcon + memberPart + (t.description || '');

            tdiv.appendChild(descSpan);

            // left click -> edit modal
            tdiv.addEventListener('click', (ev) => {
                ev.preventDefault();
                const taskObj = {
                    id: t.id,
                    date: t.date,
                    description: t.description,
                    memberId: t.memberId,
                    status: t.status,
                    taskType: t.taskType,
                    weekDay: t.weekDay
                };

                if (t.taskType === TASK_TYPES.ROUTINE) {
                    openRoutineTaskModal({ mode:'edit', task: taskObj }).catch(e => console.warn(e));
                } else {
                    openRegularTaskModal({ mode:'edit', task: taskObj }).catch(e => console.warn(e));
                }
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

        // add button (opens regular task modal)
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
                await openRegularTaskModal({ mode:'create', dateIso: iso });
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

    setTimeout(syncWeekColumnWidth, 40);
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

    // Создаем карту для задач с датами этой недели
    const weekDates = [];
    for(let i = 0; i < 7; i++) {
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        weekDates.push(formatIso(d));
    }

    const tasksByDate = {};

    // Для рутинных задач: вычисляем дату на основе weekDay и начала недели
    tasks.forEach(t => {
        if (t.taskType === TASK_TYPES.ROUTINE && t.weekDay) {
            // Вычисляем дату в текущей неделе по weekDay (1-понедельник, 7-воскресенье)
            const targetDate = new Date(mon);
            targetDate.setDate(mon.getDate() + (t.weekDay - 1));
            const dateIso = formatIso(targetDate);

            // Проверяем, что дата находится в текущей неделе
            if (weekDates.includes(dateIso)) {
                (tasksByDate[dateIso] = tasksByDate[dateIso] || []).push({
                    ...t,
                    date: dateIso // Временно присваиваем дату для отображения
                });
            }
        } else if (t.date) {
            // Для обычных задач используем их собственную дату
            (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t);
        }
    });

    for(let i = 0; i < 7; i++){
        const d = new Date(mon);
        d.setDate(mon.getDate() + i);
        const iso = formatIso(d);
        const dayOfWeek = d.getDay(); // 0-воскресенье
        const weekDay = dayOfWeek === 0 ? 7 : dayOfWeek; // конвертируем в 1-7

        const div = document.createElement('div');
        div.className = 'week-day';
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = `${d.toLocaleDateString('ru-RU', {weekday:'short'})} ${d.getDate()}`;
        div.appendChild(header);

        const tasksDiv = document.createElement('div');
        tasksDiv.className = 'tasks';

        (tasksByDate[iso] || []).forEach(t => {
            const tdiv = document.createElement('div');
            tdiv.className = 'task';

            // Добавляем класс типа задачи
            if (t.taskType === TASK_TYPES.ROUTINE) {
                tdiv.classList.add('task--routine');
            } else {
                tdiv.classList.add('task--regular');
            }

            if (t.id) tdiv.dataset.taskId = t.id;
            if (t.memberId) tdiv.dataset.memberId = t.memberId;
            if (t.status) tdiv.dataset.status = t.status;
            if (t.date) tdiv.dataset.date = t.date;
            if (t.taskType) tdiv.dataset.taskType = t.taskType;
            if (t.weekDay) tdiv.dataset.weekDay = t.weekDay;

            // apply status class for color indicator
            const sc = statusClass(t.status);
            if (sc) tdiv.classList.add(sc);

            const descSpan = document.createElement('span');
            descSpan.className = 'task-desc';

            const typeIcon = t.taskType === TASK_TYPES.ROUTINE ? '🔄 ' : '📅 ';
            const memberPart = t.memberName ? '['+t.memberName+'] ' : '';
            descSpan.textContent = typeIcon + memberPart + (t.description || '');

            tdiv.appendChild(descSpan);

            tdiv.addEventListener('click', (ev) => {
                ev.preventDefault();
                const taskObj = {
                    id: t.id,
                    date: t.date,
                    description: t.description,
                    memberId: t.memberId,
                    status: t.status,
                    taskType: t.taskType,
                    weekDay: t.weekDay
                };

                if (t.taskType === TASK_TYPES.ROUTINE) {
                    openRoutineTaskModal({ mode:'edit', task: taskObj }).catch(e => console.warn(e));
                } else {
                    openRegularTaskModal({ mode:'edit', task: taskObj }).catch(e => console.warn(e));
                }
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

        // add button -> routine task modal (for week column)
        const actions = document.createElement('div');
        actions.className = 'add-action';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-add-task';
        addBtn.textContent = 'Добавить рутинную задачу';
        addBtn.setAttribute('aria-label', `Добавить рутинную задачу на ${iso}`);
        addBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            try {
                await fetchBoardDetails();
                // weekDay уже вычислен выше (1-7)
                await openRoutineTaskModal({ mode:'create', weekDay: weekDay });
            } catch(err){
                alert('Ошибка: ' + (err.message || err));
            }
        });
        actions.appendChild(addBtn);
        div.appendChild(actions);

        weekContainer.appendChild(div);
    }

    setTimeout(syncWeekColumnWidth, 40);
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
    if (!(event && event.isTrusted)) return;
    const modal = document.getElementById('createBoardModal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(()=>loadHouseholdsIntoSelect().catch(e=>console.warn(e)), 40);
}

function hideCreateBoardModal(){
    const m=document.getElementById('createBoardModal');
    if(m) m.style.display='none';
}

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
    sel.addEventListener('change', ()=>{
        if (sel.value==='new') {
            newRow.style.display='block';
        } else {
            newRow.style.display='none';
        }
    });
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
    const res = await fetch('/api/households', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({name})
    });
    if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        throw new Error(txt || `HTTP ${res.status}`);
    }
    return await res.json();
}

async function createBoardRequest(payload){
    const res = await fetch('/api/boards', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        throw new Error(txt || `HTTP ${res.status}`);
    }
    return await res.json();
}

// bind
document.addEventListener('DOMContentLoaded', ()=>{
    // hide createBoard modal if visible before JS
    const modal = document.getElementById('createBoardModal');
    if (modal) modal.style.display = 'none';

    const openBtn = document.getElementById('openCreateBoard');
    const cancelBtn = document.getElementById('cb-cancel-btn');
    const createBtn = document.getElementById('cb-create-btn');

    if (openBtn) openBtn.addEventListener('click', (e)=> showCreateBoardModal(e));
    if (cancelBtn) cancelBtn.addEventListener('click', hideCreateBoardModal);
    if (createBtn) createBtn.addEventListener('click', submitCreateBoard);

    // ensure modals exist early
    ensureModalsExist();
});

// initial render
renderMonth(currentYear, currentMonth).catch(e=>console.warn('initial render month err', e));
renderWeek().catch(e=>console.warn('initial render week err', e));

// ===== sync week-column width =====
function syncWeekColumnWidth() {
    try {
        const monthGrid = document.querySelector('.month-grid');
        const weekCol = document.querySelector('.week-column');
        if (!monthGrid || !weekCol) return;

        if (window.innerWidth <= 900) {
            weekCol.style.width = '';
            weekCol.style.minWidth = '';
            weekCol.style.maxWidth = '';
            return;
        }

        let firstCell = monthGrid.querySelector('.day-cell:not(.empty)');
        if (!firstCell) firstCell = monthGrid.querySelector('.day-cell');
        if (!firstCell) return;

        const rect = firstCell.getBoundingClientRect();
        const width = Math.max(40, Math.round(rect.width));
        weekCol.style.width = width + 'px';
        weekCol.style.minWidth = width + 'px';
        weekCol.style.maxWidth = width + 'px';
    } catch (e) {
        console.warn('syncWeekColumnWidth error', e);
    }
}

let __syncResizeTimer = null;
window.addEventListener('load', () => {
    setTimeout(syncWeekColumnWidth, 60);
});
window.addEventListener('resize', () => {
    clearTimeout(__syncResizeTimer);
    __syncResizeTimer = setTimeout(syncWeekColumnWidth, 120);
});