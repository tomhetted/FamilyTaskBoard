-- ====================================================
-- Схема для FamilyTaskBoard — обновлённая версия миграции
-- Добавлены уникальные constraints и начальные данные
-- Кодировка файла должна быть UTF-8 (чтобы корректно вставились кириллические имена)
-- ====================================================

-- Домохозяйства
CREATE TABLE household (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_household_name (name)
);

-- Участники
CREATE TABLE member (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (household_id) REFERENCES household(id) ON DELETE CASCADE,
    UNIQUE KEY uq_member_household_name (household_id, name),
    INDEX idx_member_household (household_id)
);

-- Доски (по месяцам)
CREATE TABLE board (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    FOREIGN KEY (household_id) REFERENCES household(id) ON DELETE CASCADE,
    UNIQUE KEY uq_board_household_year_month (household_id, year, month),
    INDEX idx_board_household (household_id)
);

-- Задачи
CREATE TABLE task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    board_id BIGINT NOT NULL,
    member_id BIGINT,
    date DATE NOT NULL, -- для календаря и недельного отображения
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'TODO' CHECK (status IN ('TODO','IN_PROGRESS','DONE')),
    FOREIGN KEY (board_id) REFERENCES board(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE SET NULL,
    INDEX idx_task_date (date),
    INDEX idx_task_board (board_id)
);

-- ========== начальные данные ==========
-- Создаём домохозяйство "Семья Пепежек" и двух членов: Денис и Юля

INSERT INTO household (name) VALUES ('Семья Пепежек');
SET @hh_id = LAST_INSERT_ID();

INSERT INTO member (household_id, name) VALUES
    (@hh_id, 'Денис'),
    (@hh_id, 'Юля');
