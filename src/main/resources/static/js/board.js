// ==================== Рендер месяца ====================
function renderMonthGrid(year, month) {
    const grid = document.getElementById("monthGrid");
    grid.innerHTML = "";

    // Первый день месяца
    const firstDay = new Date(year, month - 1, 1);
    const startDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // воскресенье = 7
    const daysInMonth = new Date(year, month, 0).getDate();

    // Рисуем пустые ячейки до начала месяца
    for (let i = 1; i < startDay; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "day-cell";
        grid.appendChild(emptyCell);
    }

    // Рисуем все дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";

        // Заголовок дня
        const header = document.createElement("div");
        header.className = "day-header";
        header.textContent = day;
        cell.appendChild(header);

        // Контейнер задач
        const tasksDiv = document.createElement("div");
        tasksDiv.className = "tasks";
        tasksDiv.id = `tasks-${year}-${month}-${day}`;
        cell.appendChild(tasksDiv);

        // Форма добавления задачи
        const form = document.createElement("form");
        form.className = "add-form";
        form.onsubmit = (e) => {
            e.preventDefault();
            const input = form.querySelector("input");
            if (input.value.trim()) {
                addTask(tasksDiv.id, input.value.trim());
                input.value = "";
            }
        };

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Добавить...";
        form.appendChild(input);

        const btn = document.createElement("button");
        btn.type = "submit";
        btn.textContent = "+";
        form.appendChild(btn);

        cell.appendChild(form);

        grid.appendChild(cell);
    }
}

// ==================== Рендер текущей недели ====================
function renderWeekView(year, month) {
    const container = document.getElementById("weekContainer");
    container.innerHTML = "";

    const today = new Date(year, month - 1, 1);
    const currentDate = new Date();
    let dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay(); // 1–7
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - dayOfWeek + 1);

    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);

        const dayDiv = document.createElement("div");
        dayDiv.className = "week-day";

        const header = document.createElement("div");
        header.className = "day-header";
        header.textContent = date.toLocaleDateString("ru-RU", {
            weekday: "short",
            day: "numeric",
            month: "numeric"
        });
        dayDiv.appendChild(header);

        const tasksDiv = document.createElement("div");
        tasksDiv.className = "tasks";
        tasksDiv.id = `week-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        dayDiv.appendChild(tasksDiv);

        // Форма добавления задачи
        const form = document.createElement("form");
        form.className = "add-form";
        form.onsubmit = (e) => {
            e.preventDefault();
            const input = form.querySelector("input");
            if (input.value.trim()) {
                addTask(tasksDiv.id, input.value.trim());
                input.value = "";
            }
        };

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = "Добавить...";
        form.appendChild(input);

        const btn = document.createElement("button");
        btn.type = "submit";
        btn.textContent = "+";
        form.appendChild(btn);

        dayDiv.appendChild(form);

        container.appendChild(dayDiv);
    }
}

// ==================== Добавление задачи ====================
function addTask(containerId, text) {
    const tasksDiv = document.getElementById(containerId);
    if (!tasksDiv) return;

    const task = document.createElement("div");
    task.className = "task";
    task.textContent = text;
    tasksDiv.appendChild(task);

    // TODO: сделать POST запрос на сервер для сохранения
    // fetch(`/boards/${BOARD_ID}/tasks`, {...})
}

// ==================== Навигация ====================
document.getElementById("prevMonth").addEventListener("click", () => {
    const newDate = new Date(YEAR, MONTH - 2, 1);
    window.location.href = `/boards/${BOARD_ID}?year=${newDate.getFullYear()}&month=${newDate.getMonth() + 1}`;
});

document.getElementById("nextMonth").addEventListener("click", () => {
    const newDate = new Date(YEAR, MONTH, 1);
    window.location.href = `/boards/${BOARD_ID}?year=${newDate.getFullYear()}&month=${newDate.getMonth() + 1}`;
});

// ==================== Запуск ====================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("currentMonthLabel").textContent =
        `${YEAR}-${MONTH}`;

    renderMonthGrid(YEAR, MONTH);
    renderWeekView(YEAR, MONTH);
});
