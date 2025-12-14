package ru.smirnovjavadev.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.domain.TaskType;
import ru.smirnovjavadev.dto.TaskDTO;
import ru.smirnovjavadev.domain.Task;
import ru.smirnovjavadev.service.TaskService;

import javax.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@Validated
public class TaskController {

    private final TaskService service;
    private final Logger log = LoggerFactory.getLogger(TaskController.class);

    public TaskController(TaskService service) {
        this.service = service;
    }

    /**
     * GET /api/tasks/{id}
     * Success: 200 OK with TaskDTO
     * Errors:
     *   404 - task not found
     *   500 - unexpected server error
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        try {
            Task task = service.getById(id);
            return ResponseEntity.ok(TaskDTO.fromEntity(task));
        } catch (IllegalArgumentException ex) {
            return error(HttpStatus.NOT_FOUND, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error while fetching task id={}", id, ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * POST /api/tasks
     * Success: 201 Created, Location header to new task, body contains TaskDTO
     * Errors:
     *   400 - bad request
     *   404 - referenced board/member not found
     *   409 - conflict (FK or duplicate)
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid TaskDTO taskDto) {
        try {
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
        } catch (DataIntegrityViolationException ex) {
            log.warn("Data integrity violation on create Task: {}", ex.getMessage());
            return error(HttpStatus.CONFLICT, "Resource conflict (possible duplicate or FK constraint)");
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() == null ? "" : ex.getMessage();
            if (msg.toLowerCase().contains("not found")) {
                return error(HttpStatus.NOT_FOUND, msg);
            }
            return error(HttpStatus.BAD_REQUEST, msg);
        } catch (Exception ex) {
            log.error("Unexpected error while creating task: {}", ex.getMessage(), ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * PUT /api/tasks/{id}
     * Success: 200 OK with updated TaskDTO
     * Errors:
     *   404 - not found
     *   400 - bad request
     *   409 - conflict
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody @Valid TaskDTO taskDto) {
        try {
            Task task = service.update(
                    id,
                    taskDto.getDate(),
                    taskDto.getDescription(),
                    taskDto.getMemberId(),
                    taskDto.getStatus()
            );
            return ResponseEntity.ok(TaskDTO.fromEntity(task));
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() == null ? "" : ex.getMessage();
            if (msg.toLowerCase().contains("not found")) {
                return error(HttpStatus.NOT_FOUND, msg);
            }
            return error(HttpStatus.BAD_REQUEST, msg);
        } catch (DataIntegrityViolationException ex) {
            log.warn("Data integrity violation on update Task id={}: {}", id, ex.getMessage());
            return error(HttpStatus.CONFLICT, "Conflict updating task");
        } catch (Exception ex) {
            log.error("Unexpected error while updating task id={}", id, ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * DELETE /api/tasks/{id}
     * Success: 204 No Content
     * Errors:
     *   404 - not found
     *   500 - unexpected server error
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return error(HttpStatus.NOT_FOUND, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error while deleting task id={}", id, ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * GET /api/tasks/board/{boardId}/month?from=yyyy-MM-dd&to=yyyy-MM-dd
     * Теперь возвращает ТОЛЬКО обычные задачи (REGULAR) для календаря месяца
     * Success: 200 OK с списком TaskDTO (только обычные)
     * Errors:
     *   400 - bad request
     *   404 - board not found
     *   500 - unexpected server error
     */
    @GetMapping("/board/{boardId}/month")
    public ResponseEntity<?> forMonth(
            @PathVariable Long boardId,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        try {
            if (boardId == null) return error(HttpStatus.BAD_REQUEST, "boardId is required");

            // Получаем ТОЛЬКО обычные задачи для месяца
            List<TaskDTO> tasks = service.forMonth(boardId, from, to).stream()
                    .map(TaskDTO::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(tasks);
        } catch (IllegalArgumentException ex) {
            return error(HttpStatus.BAD_REQUEST, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error while fetching month tasks for board {}: {}", boardId, ex.getMessage(), ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * GET /api/tasks/board/{boardId}/week?start=yyyy-MM-dd
     * Теперь возвращает ТОЛЬКО рутинные задачи (ROUTINE) для недельной колонки
     * Success: 200 OK с списком TaskDTO (только рутинные)
     * Errors:
     *   400 - bad request (missing params)
     *   404 - board not found
     *   500 - unexpected server error
     */
    @GetMapping("/board/{boardId}/week")
    public ResponseEntity<?> forWeek(
            @PathVariable Long boardId,
            @RequestParam("start") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {

        try {
            if (boardId == null) return error(HttpStatus.BAD_REQUEST, "boardId is required");
            if (weekStart == null) return error(HttpStatus.BAD_REQUEST, "start date is required");

            // Получаем ТОЛЬКО рутинные задачи для недели
            List<TaskDTO> tasks = service.forWeek(boardId, weekStart).stream()
                    .map(TaskDTO::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(tasks);
        } catch (IllegalArgumentException ex) {
            return error(HttpStatus.BAD_REQUEST, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error while fetching week tasks for board {} start {}: {}",
                    boardId, weekStart, ex.getMessage(), ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * GET /api/tasks/board/{boardId}/routines
     * Получение всех рутинных задач для доски
     * Success: 200 OK с списком TaskDTO рутинных задач
     * Errors:
     *   400 - неверный запрос
     *   500 - внутренняя ошибка сервера
     */
    @GetMapping("/board/{boardId}/routines")
    public ResponseEntity<?> getRoutines(@PathVariable Long boardId) {
        try {
            List<TaskDTO> routines = service.getRoutineTasksForWeek(boardId).stream()
                    .map(TaskDTO::fromEntity)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(routines);
        } catch (IllegalArgumentException ex) {
            return error(HttpStatus.BAD_REQUEST, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error while fetching routine tasks for board {}", boardId, ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    // helper
    private ResponseEntity<ErrorPayload> error(HttpStatus status, String message) {
        ErrorPayload payload = new ErrorPayload(status.value(), message == null ? status.getReasonPhrase() : message);
        return ResponseEntity.status(status).body(payload);
    }

    public static class ErrorPayload {
        private final int status;
        private final String message;
        public ErrorPayload(int status, String message) { this.status = status; this.message = message; }
        public int getStatus() { return status; }
        public String getMessage() { return message; }
    }
}
