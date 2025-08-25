package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.Task;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByBoardId(Long boardId);

    List<Task> findAllByBoardIdAndDateBetween(Long boardId, LocalDate start, LocalDate end);
}
