-- Домохозяйства
CREATE TABLE household (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Участники
CREATE TABLE member (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    FOREIGN KEY (household_id) REFERENCES household(id) ON DELETE CASCADE
);

-- Доски (по месяцам)
CREATE TABLE board (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    household_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    FOREIGN KEY (household_id) REFERENCES household(id) ON DELETE CASCADE,
    UNIQUE KEY uq_board_month (household_id, month, year)
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
    FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE SET NULL
);
