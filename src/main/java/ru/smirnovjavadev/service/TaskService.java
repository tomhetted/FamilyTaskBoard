package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
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

    public Task getById(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Task not found"));
    }

    public Task create(Long boardId, LocalDate date, String description, Long memberId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        Member member = null;
        if (memberId != null) {
            member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new IllegalArgumentException("Member not found"));
        }

        Task task = Task.builder()
                .board(board)
                .member(member)
                .date(date)
                .description(description)
                .status(TaskStatus.TODO)
                .build();

        return taskRepository.save(task);
    }

    public List<Task> forMonth(Long boardId) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        // Пример: вернем все задачи, фильтруя по месяцу текущей даты
        LocalDate now = LocalDate.now();
        return taskRepository.findAllByBoardIdAndDateBetween(boardId,
                now.withDayOfMonth(1),
                now.withDayOfMonth(now.lengthOfMonth()));
    }

    public List<Task> forWeek(Long boardId, LocalDate weekStart) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));

        LocalDate weekEnd = weekStart.plusDays(6);
        return taskRepository.findAllByBoardIdAndDateBetween(boardId, weekStart, weekEnd);
    }
}
