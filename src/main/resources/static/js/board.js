document.addEventListener('DOMContentLoaded', () => {

    function pad(n) { return n < 10 ? '0'+n : n; }
    function toIso(date) {
        return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
    }

    async function fetchTasks(boardId) {
        const resp = await fetch(`/api/boards/${boardId}/tasks`);
        return resp.ok ? await resp.json() : [];
    }

    async function createTask(boardId, date, desc) {
        const resp = await fetch(`/api/boards/${boardId}/tasks`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({date: date, description: desc})
        });
        return resp.ok;
    }

    async function loadAndRender() {
        const tasks = await fetchTasks(BOARD_ID);
        const tasksByDate = {};
        tasks.forEach(t => (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t));

        renderMonth(tasksByDate);
        renderWeek(new Date(YEAR, MONTH-1, 1));
    }

    function renderMonth(tasksByDate) {
        const grid = document.getElementById('monthGrid');
        grid.innerHTML = '';
        const firstDay = new Date(YEAR, MONTH-1, 1);
        const lastDay = new Date(YEAR, MONTH, 0);

        for(let d=1; d<=lastDay.getDate(); d++){
            const dt = new Date(YEAR, MONTH-1, d);
            const cell = document.createElement('div'); cell.className='day-cell';

            const header = document.createElement('div'); header.className='day-header';
            header.textContent = dt.getDate() + ' ' + ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(dt.getDay()+6)%7];
            cell.appendChild(header);

            const tasksDiv = document.createElement('div'); tasksDiv.className='tasks';
            (tasksByDate[toIso(dt)] || []).forEach(t => {
                const tdiv = document.createElement('div'); tdiv.className='task';
                tdiv.textContent = (t.memberName ? '['+t.memberName+'] ' : '') + t.description;
                tasksDiv.appendChild(tdiv);
            });
            cell.appendChild(tasksDiv);

            const form = document.createElement('div'); form.className='add-form';
            const input = document.createElement('input'); input.type='text'; input.placeholder='Новая задача...';
            const btn = document.createElement('button'); btn.type='button'; btn.textContent='+';
            btn.addEventListener('click', async ()=>{
                const desc = input.value && input.value.trim();
                if(!desc) return alert('Введите описание');
                const created = await createTask(BOARD_ID, toIso(dt), desc);
                if(created) loadAndRender(); else alert('Ошибка при создании');
            });
            form.appendChild(input); form.appendChild(btn);
            cell.appendChild(form);

            grid.appendChild(cell);
        }

        document.getElementById('currentMonthLabel').textContent = `${YEAR}-${pad(MONTH)}`;
    }

    async function renderWeek(startDate) {
        const weekContainer = document.getElementById('weekContainer');
        weekContainer.innerHTML='';
        // Для простоты рендерим текущую неделю без запроса на сервер
        for(let i=0;i<7;i++){
            const d = new Date(startDate); d.setDate(startDate.getDate()+i);
            const div = document.createElement('div'); div.className='week-day';
            div.textContent = d.toLocaleDateString() + ' ' + ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(d.getDay()+6)%7];
            weekContainer.appendChild(div);
        }
    }

    loadAndRender();
});
