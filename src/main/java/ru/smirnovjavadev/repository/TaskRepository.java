package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.Task;
import ru.smirnovjavadev.domain.TaskType;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByBoardId(Long boardId);

    List<Task> findAllByBoardIdAndDateBetweenOrderByDateAsc(Long boardId, LocalDate start, LocalDate end);

    List<Task> findAllByBoardIdAndTaskTypeAndDateBetween(
            Long boardId, TaskType taskType, LocalDate start, LocalDate end);


    // Для календаря месяца: обычные задачи в диапазоне дат
    List<Task> findAllByBoardIdAndTaskTypeAndDateBetweenOrderByDateAsc(
            Long boardId, TaskType taskType, LocalDate start, LocalDate end);

    // Для недельной колонки: все рутинные задачи доски
    List<Task> findByBoardIdAndTaskType(Long boardId, TaskType taskType);
}
