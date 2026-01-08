package ru.smirnovjavadev.controller;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.domain.TaskType;
import ru.smirnovjavadev.dto.TaskDTO;
import ru.smirnovjavadev.domain.Task;
import ru.smirnovjavadev.service.TaskService;

import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@Validated
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    /**
     * GET /api/tasks/{id}
     * Success: 200 OK with TaskDTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> get(@PathVariable Long id) {
        Task task = service.getById(id);
        return ResponseEntity.ok(TaskDTO.fromEntity(task));
    }

    /**
     * POST /api/tasks
     * Success: 201 Created, Location header to new task, body contains TaskDTO
     */
    @PostMapping
    public ResponseEntity<TaskDTO> create(@RequestBody @Valid TaskDTO taskDto) {
        Task task = service.create(
                taskDto.getBoardId(),
                taskDto.getDate(),
                taskDto.getDescription(),
                taskDto.getMemberId(),
                taskDto.getStatus(),
                taskDto.getTaskType() != null ? taskDto.getTaskType() : TaskType.REGULAR,
                taskDto.getWeekDay()
        );
        TaskDTO body = TaskDTO.fromEntity(task);
        URI location = URI.create("/api/tasks/" + task.getId());
        return ResponseEntity.created(location).body(body);
    }

    /**
     * PUT /api/tasks/{id}
     * Success: 200 OK with updated TaskDTO
     */
    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> update(@PathVariable Long id, @RequestBody @Valid TaskDTO taskDto) {
        Task task = service.update(
                id,
                taskDto.getDate(),
                taskDto.getDescription(),
                taskDto.getMemberId(),
                taskDto.getStatus()
        );
        return ResponseEntity.ok(TaskDTO.fromEntity(task));
    }

    /**
     * DELETE /api/tasks/{id}
     * Success: 204 No Content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/tasks/board/{boardId}/month?from=yyyy-MM-dd&to=yyyy-MM-dd
     * Returns ONLY regular tasks (REGULAR) for month calendar
     * Success: 200 OK with list of TaskDTO (only regular)
     */
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

    /**
     * GET /api/tasks/board/{boardId}/week?start=yyyy-MM-dd
     * Returns ONLY routine tasks (ROUTINE) for week column
     * Success: 200 OK with list of TaskDTO (only routine)
     */
    @GetMapping("/board/{boardId}/week")
    public ResponseEntity<List<TaskDTO>> forWeek(
            @PathVariable Long boardId,
            @RequestParam("start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {

        List<TaskDTO> tasks = service.forWeek(boardId, weekStart).stream()
                .map(TaskDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(tasks);
    }

    /**
     * GET /api/tasks/board/{boardId}/routines
     * Get all routine tasks for board
     * Success: 200 OK with list of TaskDTO routine tasks
     */
    @GetMapping("/board/{boardId}/routines")
    public ResponseEntity<List<TaskDTO>> getRoutines(@PathVariable Long boardId) {
        List<TaskDTO> routines = service.getRoutineTasksForWeek(boardId).stream()
                .map(TaskDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(routines);
    }
}