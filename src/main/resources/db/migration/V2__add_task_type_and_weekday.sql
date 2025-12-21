-- Добавляем тип задачи и день недели для рутинных задач
ALTER TABLE task
ADD COLUMN task_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR'
    CHECK (task_type IN ('REGULAR', 'ROUTINE')),
ADD COLUMN week_day INT NULL
    CHECK (week_day IS NULL OR (week_day BETWEEN 1 AND 7));

-- Индекс для фильтрации по типу и дню недели
CREATE INDEX idx_task_type_weekday ON task(task_type, week_day);

-- Комментарий для пояснения
ALTER TABLE task
MODIFY COLUMN week_day INT NULL COMMENT 'День недели для рутинных задач: 1-понедельник, 7-воскресенье';