package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.domain.Task;
import ru.smirnovjavadev.domain.TaskStatus;
import ru.smirnovjavadev.repository.BoardRepository;
import ru.smirnovjavadev.repository.MemberRepository;
import ru.smirnovjavadev.repository.TaskRepository;

import java.time.LocalDate;
import java.util.List;

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
    public Task create(Long boardId, LocalDate date, String description, Long memberId) {
        if (boardId == null) throw new IllegalArgumentException("boardId is required");
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        Member member = null;
        if (memberId != null) {
            member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new IllegalArgumentException("Member not found"));
        }

        if (date == null) date = LocalDate.now();

        Task task = Task.builder()
                .board(board)
                .member(member)
                .date(date)
                .description(description)
                .status(TaskStatus.TODO)
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
        return taskRepository.findAllByBoardIdAndDateBetweenOrderByDateAsc(boardId, from, to);
    }

    @Transactional(readOnly = true)
    public List<Task> forWeek(Long boardId, LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        return taskRepository.findAllByBoardIdAndDateBetweenOrderByDateAsc(boardId, weekStart, weekEnd);
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
}
