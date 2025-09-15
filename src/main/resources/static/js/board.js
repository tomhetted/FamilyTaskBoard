// board.js — updated to match backend routes (/api/tasks/board/... and POST /api/tasks)

const MONTH_NAMES = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];

function pad(n){ return n < 10 ? '0' + n : '' + n; }
function toIso(date){ return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }

// --- API (routes adjusted to current controllers) ---
async function fetchMonthTasks(boardId) {
    try {
        const res = await fetch(`/api/tasks/board/${boardId}/month`);
        if (!res.ok) {
            console.warn('fetchMonthTasks failed', res.status, await res.text());
            return [];
        }
        return await res.json();
    } catch (e) {
        console.error('fetchMonthTasks', e);
        return [];
    }
}

async function fetchWeekTasks(boardId, weekStartIso) {
    try {
        const res = await fetch(`/api/tasks/board/${boardId}/week?start=${encodeURIComponent(weekStartIso)}`);
        if (!res.ok) {
            console.warn('fetchWeekTasks failed', res.status, await res.text());
            return [];
        }
        return await res.json();
    } catch (e) {
        console.error('fetchWeekTasks', e);
        return [];
    }
}

// POST /api/tasks expects JSON TaskDTO in the body according to your TaskController
async function createTaskApi(boardId, dateIso, desc, memberId) {
    try {
        const payload = {
            boardId: boardId,
            date: dateIso,
            description: desc
        };
        if (memberId) payload.memberId = memberId;

        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error('createTask failed', res.status, await res.text());
            return null;
        }
        return await res.json();
    } catch (e) {
        console.error('createTaskApi', e);
        return null;
    }
}

// --- UI helpers (unchanged except calling corrected APIs) ---
function updateHeader() {
    const title = document.getElementById('boardTitle');
    if (title) title.textContent = `${MONTH_NAMES[MONTH - 1]} ${YEAR}`;
    document.title = `${MONTH_NAMES[MONTH - 1]} ${YEAR} - TaskBoard`;
    const lbl = document.getElementById('currentMonthLabel');
    if (lbl) lbl.textContent = `${YEAR}-${pad(MONTH)}`;
}

function buildMonthDays(year, month) {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const days = [];
    const firstWeekday = (first.getDay() + 6) % 7; // Monday=0
    for (let i = 0; i < firstWeekday; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month - 1, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
}

function clearChildren(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function renderMonthGrid(tasks) {
    const grid = document.getElementById('monthGrid');
    if (!grid) return;
    clearChildren(grid);

    const days = buildMonthDays(YEAR, MONTH);
    const tasksByDate = {};
    (tasks || []).forEach(t => { tasksByDate[t.date] = tasksByDate[t.date] || []; tasksByDate[t.date].push(t); });

    days.forEach(dt => {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (dt === null) { cell.classList.add('empty'); grid.appendChild(cell); return; }

        const iso = toIso(dt);
        const header = document.createElement('div');
        header.className = 'day-header';
        const weekday = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(dt.getDay()+6)%7];
        header.innerHTML = `<span>${dt.getDate()}</span><span class="small">${weekday}</span>`;
        cell.appendChild(header);

        const tasksDiv = document.createElement('div'); tasksDiv.className = 'tasks';
        const list = tasksByDate[iso] || [];
        list.forEach(t => {
            const tdiv = document.createElement('div'); tdiv.className = 'task';
            tdiv.textContent = (t.memberName ? '[' + t.memberName + '] ' : '') + t.description;
            tasksDiv.appendChild(tdiv);
        });
        cell.appendChild(tasksDiv);

        const form = document.createElement('div'); form.className = 'add-form';
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Новая задача...';
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '+'; btn.title = 'Добавить задачу';
        btn.addEventListener('click', async () => {
            const desc = input.value && input.value.trim();
            if (!desc) return alert('Введите описание задачи');
            btn.disabled = true;
            const created = await createTaskApi(BOARD_ID, iso, desc, null);
            btn.disabled = false;
            if (created) { input.value = ''; await loadAndRender(); } else alert('Ошибка при создании задачи');
        });
        form.appendChild(input); form.appendChild(btn); cell.appendChild(form);

        grid.appendChild(cell);
    });

    updateHeader();
}

async function renderWeek(weekStartDate) {
    const iso = toIso(weekStartDate);
    const weekContainer = document.getElementById('weekContainer');
    if (!weekContainer) return;
    clearChildren(weekContainer);

    const tasks = await fetchWeekTasks(BOARD_ID, iso);
    const map = {};
    (tasks || []).forEach(t => { (map[t.date] = map[t.date] || []).push(t); });

    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate);
        d.setDate(weekStartDate.getDate() + i);
        const dayIso = toIso(d);
        const div = document.createElement('div'); div.className = 'week-day';
        const weekday = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(d.getDay()+6)%7];
        const header = document.createElement('div'); header.className = 'day-header';
        header.innerHTML = `<span>${d.toLocaleDateString()}</span><span class="small">${weekday}</span>`;
        div.appendChild(header);

        const list = map[dayIso] || [];
        list.forEach(t => {
            const tdiv = document.createElement('div'); tdiv.className = 'task';
            tdiv.textContent = (t.memberName ? '[' + t.memberName + '] ' : '') + t.description;
            div.appendChild(tdiv);
        });

        const form = document.createElement('div'); form.className = 'add-form';
        const input = document.createElement('input'); input.type = 'text'; input.placeholder = 'Новая задача...';
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '+'; btn.title = 'Добавить задачу в эту дату';
        btn.addEventListener('click', async () => {
            const desc = input.value && input.value.trim();
            if (!desc) return alert('Введите описание задачи');
            btn.disabled = true;
            const created = await createTaskApi(BOARD_ID, dayIso, desc, null);
            btn.disabled = false;
            if (created) { input.value = ''; await loadAndRender(); } else alert('Ошибка при создании задачи');
        });
        form.appendChild(input); form.appendChild(btn); div.appendChild(form);

        weekContainer.appendChild(div);
    }
}

async function loadAndRender() {
    if (!BOARD_ID) { console.warn('BOARD_ID not set'); return; }
    const monthTasks = await fetchMonthTasks(BOARD_ID);
    renderMonthGrid(monthTasks);

    const firstOfMonth = new Date(YEAR, MONTH - 1, 1);
    const weekday = (firstOfMonth.getDay() + 6) % 7;
    const monday = new Date(firstOfMonth); monday.setDate(firstOfMonth.getDate() - weekday);
    await renderWeek(monday);
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof YEAR === 'undefined' || typeof MONTH === 'undefined') {
        const now = new Date(); YEAR = now.getFullYear(); MONTH = now.getMonth() + 1;
    }

    document.getElementById('prevMonth').addEventListener('click', async () => {
        MONTH--; if (MONTH < 1) { MONTH = 12; YEAR--; } await loadAndRender();
    });
    document.getElementById('nextMonth').addEventListener('click', async () => {
        MONTH++; if (MONTH > 12) { MONTH = 1; YEAR++; } await loadAndRender();
    });

    loadAndRender();
});
