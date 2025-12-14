package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.*;
import ru.smirnovjavadev.repository.BoardRepository;
import ru.smirnovjavadev.repository.MemberRepository;
import ru.smirnovjavadev.repository.TaskRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final BoardRepository boardRepository;
    private final MemberRepository memberRepository;

    public TaskService(TaskRepository taskRepository, BoardRepository boardRepository, MemberRepository memberRepository) {
        this.taskRepository = taskRepository;
        this.boardRepository = boardRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public Task getById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
    }

    @Transactional
    public Task create(Long boardId, LocalDate date, String description, Long memberId,
                       TaskStatus status, TaskType taskType, Integer weekDay) {
        if (boardId == null) throw new IllegalArgumentException("boardId is required");
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        Member member = null;
        if (memberId != null) {
            member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new IllegalArgumentException("Member not found"));
        }

        if (taskType == TaskType.ROUTINE && weekDay == null) {
            throw new IllegalArgumentException("Для рутинных задач укажите день недели");
        }
        if (taskType == TaskType.REGULAR && date == null) {
            throw new IllegalArgumentException("Для обычных задач укажите дату");
        }

        if (date == null) date = LocalDate.now();

        Task task = Task.builder()
                .board(board)
                .member(member)
                .date(date)
                .description(description)
                .status(status)
                .taskType(taskType)
                .weekDay(weekDay)
                .build();

        return taskRepository.save(task);
    }

    @Transactional(readOnly = true)
    public List<Task> forMonth(Long boardId, LocalDate from, LocalDate to) {
        // Если from/to == null, возвращаем текущий месяц (fallback)
        LocalDate now = LocalDate.now();
        if (from == null || to == null) {
            from = now.withDayOfMonth(1);
            to = now.withDayOfMonth(now.lengthOfMonth());
        }

        // ТОЛЬКО обычные задачи (REGULAR) для календаря месяца
        return taskRepository.findAllByBoardIdAndTaskTypeAndDateBetweenOrderByDateAsc(
                boardId, TaskType.REGULAR, from, to);
    }

    @Transactional(readOnly = true)
    public List<Task> forWeek(Long boardId, LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);

        // Получаем рутинные задачи, дата которых попадает в эту неделю
        // Теперь рутинные задачи имеют дату и не повторяются
        return taskRepository.findAllByBoardIdAndTaskTypeAndDateBetweenOrderByDateAsc(
                boardId, TaskType.ROUTINE, weekStart, weekEnd);
    }

    @Transactional
    public Task update(Long id, LocalDate date, String description, Long memberId, TaskStatus status) {
        Task task = taskRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Task not found"));
        if (date != null) task.setDate(date);
        if (description != null) task.setDescription(description);
        if (status != null) task.setStatus(status);
        if (memberId != null) {
            Member member = memberRepository.findById(memberId).orElseThrow(() -> new IllegalArgumentException("Member not found"));
            task.setMember(member);
        } else {
            task.setMember(null);
        }
        return taskRepository.save(task);
    }

    @Transactional
    public void delete(Long id) {
        if (!taskRepository.existsById(id)) throw new IllegalArgumentException("Task not found");
        taskRepository.deleteById(id);
    }

    // Новый метод для получения рутинных задач недели
    @Transactional(readOnly = true)
    public List<Task> getRoutineTasksForWeek(Long boardId) {
        return taskRepository.findByBoardIdAndTaskType(boardId, TaskType.ROUTINE);
    }


}
