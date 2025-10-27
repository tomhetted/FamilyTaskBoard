/* ===================== board.js ===================== */
/* Основная логика отображения календаря, недели и создания доски (без автопоказа модалки) */

const boardData = document.getElementById("boardData");
const boardId = boardData?.dataset.boardId;
const year = parseInt(boardData?.dataset.year);
const month = parseInt(boardData?.dataset.month);

const monthGrid = document.getElementById("monthGrid");
const weekContainer = document.getElementById("weekContainer");
const currentMonthLabel = document.getElementById("currentMonthLabel");

let currentYear = Number.isFinite(year) ? year : (new Date()).getFullYear();
let currentMonth = Number.isFinite(month) ? month : (new Date()).getMonth() + 1;

// ======= Вспомогательные функции =======
function getDaysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function getWeekNumber(date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date - firstDay) / 86400000;
  return Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
}

// Рендер заголовка дней недели (вызывается один раз внутри renderMonth)
function renderWeekdayHeader() {
  const header = document.getElementById('weekdayRow');
  if (!header) return;
  // уже содержится в HTML статически — при желании можно динамически заполнять
  // но на всякий случай очистим и заново добавим (устойчиво)
  const names = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  header.innerHTML = '';
  names.forEach(n => {
    const d = document.createElement('div');
    d.className = 'weekday';
    d.textContent = n;
    header.appendChild(d);
  });
}

// ======= Генерация сетки месяца =======
function renderMonth(y, m) {
  if (!monthGrid) return;
  // рендер заголовка дней недели (на всякий случай)
  renderWeekdayHeader();

  monthGrid.innerHTML = "";

  // вычислим день недели первого числа (0 = Monday по нашей логике)
  const first = new Date(y, m - 1, 1);
  // JS: getDay() 0=Sun,1=Mon,...; хотим 0=Mon ... 6=Sun
  const firstWeekday = (first.getDay() + 6) % 7;

  // вставим пустые заполнители перед первым днем, чтобы сдвинуть числа
  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    monthGrid.appendChild(empty);
  }

  const days = getDaysInMonth(y, m);
  if (currentMonthLabel) currentMonthLabel.textContent = `${y}-${String(m).padStart(2, "0")}`;

  for (let day = 1; day <= days; day++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";

    const header = document.createElement("div");
    header.className = "day-header";
    header.innerHTML = `<span>${day}</span><span class="small">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][(new Date(y, m-1, day).getDay()+6)%7]}</span>`;
    cell.appendChild(header);

    const tasks = document.createElement("div");
    tasks.className = "tasks";
    cell.appendChild(tasks);

    const addForm = document.createElement("form");
    addForm.className = "add-form";
    addForm.innerHTML = `
      <input type="text" placeholder="Новая задача...">
      <button type="submit">+</button>
    `;
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = addForm.querySelector("input");
      if (input && input.value.trim() !== "") {
        const task = document.createElement("div");
        task.className = "task";
        task.textContent = input.value.trim();
        tasks.appendChild(task);
        input.value = "";
      }
    });

    cell.appendChild(addForm);
    monthGrid.appendChild(cell);
  }

  // После заполнения всех дней, можно подставить дополнительные пустые ячейки,
  // чтобы последняя неделя была полной (чтобы grid был ровным)
  while (monthGrid.childElementCount % 7 !== 0) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    monthGrid.appendChild(empty);
  }

  // обновляем колонку с текущей неделей (обычная логика)
  renderCurrentWeek();
}

// ======= Отображение текущей недели =======
function renderCurrentWeek() {
  if (!weekContainer) return;
  weekContainer.innerHTML = "";
  const today = new Date();

  // Построим неделю: от воскресенья до субботы (как в текущей реализации)
  for (let i = 0; i < 7; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + i);
    const weekDay = document.createElement("div");
    weekDay.className = "week-day";

    const header = document.createElement("div");
    header.className = "day-header";
    header.textContent = `${day.toLocaleDateString("ru-RU", { weekday: "short" })} ${day.getDate()}`;
    weekDay.appendChild(header);

    const tasks = document.createElement("div");
    tasks.className = "tasks";
    weekDay.appendChild(tasks);

    weekContainer.appendChild(weekDay);
  }
}

// ======= Навигация по месяцам =======
const prevBtn = document.getElementById("prevMonth");
const nextBtn = document.getElementById("nextMonth");
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    renderMonth(currentYear, currentMonth);
  });
}
if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    renderMonth(currentYear, currentMonth);
  });
}

// ======= Первичная инициализация =======
renderMonth(currentYear, currentMonth);

/* ===================== Модал "Создать доску" ===================== */

/* Безопасный fetch JSON */
async function safeFetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn("safeFetchJson failed:", url, e);
    return [];
  }
}

/* Загрузка списка домохозяйств */
async function loadHouseholdsIntoSelect() {
  const sel = document.getElementById("cb-household-select");
  const newRow = document.getElementById("cb-new-household-row");
  if (!sel) return;

  sel.innerHTML = '<option value="">(Загрузка...)</option>';
  const list = await safeFetchJson("/api/households");
  // лог для диагностики (вынести/убрать потом при необходимости)
  console.debug("loadHouseholdsIntoSelect -> received:", list);
  sel.innerHTML = "";

  if (Array.isArray(list) && list.length) {
    list.forEach((h) => {
      const o = document.createElement("option");
      o.value = h.id;
      o.textContent = h.name;
      sel.appendChild(o);
    });
  } else {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "(Нет домохозяйств)";
    sel.appendChild(o);
  }

  // добавляем в конец пункт "Создать новое домохозяйство"
  const optNew = document.createElement("option");
  optNew.value = "new";
  optNew.textContent = "Создать новое домохозяйство...";
  sel.appendChild(optNew);

  // убираем предыдущие обработчики изменения, если они есть, чтобы не дублировать
  sel.onchange = null;
  sel.addEventListener("change", () => {
    if (sel.value === "new") {
      if (newRow) newRow.style.display = "block";
    } else {
      if (newRow) newRow.style.display = "none";
    }
  });
}

/* Создание домохозяйства */
async function createHousehold(name) {
  const res = await fetch("/api/households", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => null);
    throw new Error(errBody || `Ошибка ${res.status}`);
  }
  return await res.json();
}

/* Создание доски */
async function createBoardRequest(payload) {
  const res = await fetch("/api/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => null);
    throw new Error(errBody || `Ошибка ${res.status}`);
  }
  return await res.json();
}

/* Защитный showCreateBoardModal:
   - открывает модалку только при реальном пользовательском событии (event.isTrusted === true)
   - или при явном вызове force === true (для тестов/административных сценариев)
*/
function showCreateBoardModal(event = null, force = false) {
  if (!force && !(event && event.isTrusted)) {
    // Блокируем программный автопоказ
    console.debug("showCreateBoardModal blocked (not user event)");
    return;
  }

  const modal = document.getElementById("createBoardModal");
  if (!modal) return;

  const now = new Date();
  const yearEl = document.getElementById("cb-year");
  const monthEl = document.getElementById("cb-month");
  const titleEl = document.getElementById("cb-title");
  const errEl = document.getElementById("cb-error");

  if (yearEl) yearEl.value = now.getFullYear();
  if (monthEl) monthEl.value = now.getMonth() + 1;
  if (titleEl) titleEl.value = "";
  if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

  // Показываем модалку и грузим список чуть позже (даём отрисоваться)
  modal.style.display = "flex";
  setTimeout(() => {
    loadHouseholdsIntoSelect().catch(e => {
      console.warn("loadHouseholdsIntoSelect failed:", e);
      const sel = document.getElementById("cb-household-select");
      if (sel) sel.innerHTML = "<option value=''>Ошибка загрузки</option>";
    });
  }, 50);
}

function hideCreateBoardModal() {
  const modal = document.getElementById("createBoardModal");
  if (modal) modal.style.display = "none";
}

/* Обработка создания доски */
async function submitCreateBoard() {
  const titleEl = document.getElementById("cb-title");
  const yearEl = document.getElementById("cb-year");
  const monthEl = document.getElementById("cb-month");
  const sel = document.getElementById("cb-household-select");
  const newHouseNameEl = document.getElementById("cb-new-household-name");
  const err = document.getElementById("cb-error");

  if (!yearEl || !monthEl || !sel) {
    if (err) { err.style.display = "block"; err.textContent = "Внутренняя ошибка формы"; }
    return;
  }

  const title = titleEl ? titleEl.value.trim() : "";
  const y = parseInt(yearEl.value, 10);
  const m = parseInt(monthEl.value, 10);
  const selVal = sel.value;
  const newHouseName = newHouseNameEl ? newHouseNameEl.value.trim() : "";

  try {
    if (!y || !m || m < 1 || m > 12) throw new Error("Укажите корректный год и месяц");

    let householdId = null;
    if (selVal === "new") {
      if (!newHouseName) throw new Error("Введите название нового домохозяйства");
      const createdHouse = await createHousehold(newHouseName);
      householdId = createdHouse.id;
    } else if (selVal) {
      householdId = parseInt(selVal, 10);
    } else {
      throw new Error("Выберите домохозяйство или создайте новое");
    }

    const payload = {
      title: title || `Board ${m}/${y}`,
      year: y,
      month: m,
      householdId
    };

    const createdBoard = await createBoardRequest(payload);
    if (createdBoard && createdBoard.id) {
      window.location.href = `/boards/${createdBoard.id}`;
    } else {
      throw new Error("Пустой ответ от сервера");
    }
  } catch (e) {
    if (err) { err.style.display = "block"; err.textContent = e.message || "Ошибка при создании"; }
    console.warn("submitCreateBoard error:", e);
  }
}

/* Привязка обработчиков — открытие модалки исключительно по клику пользователя */
document.addEventListener("DOMContentLoaded", () => {
  // на всякий случай скрываем модалку сразу (если стили/HTML сделали её видимой до JS)
  const modalOnLoad = document.getElementById("createBoardModal");
  if (modalOnLoad) modalOnLoad.style.display = "none";

  const openBtn = document.getElementById("openCreateBoard");
  const cancelBtn = document.getElementById("cb-cancel-btn");
  const createBtn = document.getElementById("cb-create-btn");
  const modalElem = document.getElementById("createBoardModal");

  if (openBtn) {
    // передаём реальное событие в showCreateBoardModal (позволяет проверять event.isTrusted)
    openBtn.addEventListener("click", (e) => showCreateBoardModal(e, false));
  }
  if (cancelBtn) cancelBtn.addEventListener("click", hideCreateBoardModal);
  if (createBtn) createBtn.addEventListener("click", submitCreateBoard);

  if (modalElem) {
    modalElem.addEventListener("click", (e) => {
      if (e.target === modalElem) hideCreateBoardModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideCreateBoardModal();
  });
});
/* ===================== /board.js ===================== */
