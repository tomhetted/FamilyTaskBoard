package ru.smirnovjavadev.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.TaskDTO;
import ru.smirnovjavadev.domain.Task;
import ru.smirnovjavadev.domain.TaskStatus;
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

    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> get(@PathVariable Long id) {
        Task task = service.getById(id);
        return ResponseEntity.ok(TaskDTO.fromEntity(task));
    }

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

    // Обновление задачи
    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> update(@PathVariable Long id, @RequestBody TaskDTO taskDto) {
        Task task = service.update(
                id,
                taskDto.getDate(),
                taskDto.getDescription(),
                taskDto.getMemberId(),
                taskDto.getStatus()
        );
        return ResponseEntity.ok(TaskDTO.fromEntity(task));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Получение задач на месяц — теперь принимает from/to в ISO формате (опционально)
    @GetMapping("/board/{boardId}/month")
    public ResponseEntity<List<TaskDTO>> forMonth(
            @PathVariable Long boardId,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        List<TaskDTO> tasks = service.forMonth(boardId, from, to).stream()
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
