package ru.smirnovjavadev.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.TaskDTO;
import ru.smirnovjavadev.domain.Task;
import ru.smirnovjavadev.service.TaskService;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    // Получение конкретной задачи по ID
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> get(@PathVariable Long id) {
        Task task = service.getById(id);
        return ResponseEntity.ok(TaskDTO.fromEntity(task));
    }

    // Создание новой задачи через JSON
    @PostMapping
    public ResponseEntity<TaskDTO> create(@RequestBody TaskDTO taskDto) {
        Task task = service.create(
                taskDto.getBoardId(),
                taskDto.getDate(),
                taskDto.getDescription(),
                taskDto.getMemberId()
        );
        return ResponseEntity.ok(TaskDTO.fromEntity(task));
    }

    // Получение задач на месяц по ID доски
    @GetMapping("/board/{boardId}/month")
    public ResponseEntity<List<TaskDTO>> forMonth(@PathVariable Long boardId) {
        List<TaskDTO> tasks = service.forMonth(boardId).stream()
                .map(TaskDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(tasks);
    }

    // Получение задач на неделю по ID доски и дате начала недели
    @GetMapping("/board/{boardId}/week")
    public ResponseEntity<List<TaskDTO>> forWeek(
            @PathVariable Long boardId,
            @RequestParam("start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {

        List<TaskDTO> tasks = service.forWeek(boardId, weekStart).stream()
                .map(TaskDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(tasks);
    }
}
