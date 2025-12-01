package ru.smirnovjavadev.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.BoardDTO;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.service.BoardService;

import javax.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/boards")
@Validated
public class BoardController {

    private final BoardService service;
    private final Logger log = LoggerFactory.getLogger(BoardController.class);

    public BoardController(BoardService service) {
        this.service = service;
    }

    /**
     * GET /api/boards/{id}
     * Success: 200 OK with BoardDTO
     * Errors:
     *   404 - board not found
     *   400 - bad request
     *   500 - unexpected server error
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        try {
            Board board = service.getById(id);
            BoardDTO dto = service.toDto(board);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException ex) {
            // heuristic: "not found" text -> 404, otherwise 400
            String msg = ex.getMessage() == null ? "" : ex.getMessage();
            if (msg.toLowerCase().contains("not found")) {
                return error(HttpStatus.NOT_FOUND, msg);
            }
            return error(HttpStatus.BAD_REQUEST, msg);
        } catch (Exception ex) {
            log.error("Unexpected error while fetching board id={}", id, ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * POST /api/boards
     * Success: 201 Created, Location header points to new resource, body contains created DTO
     * Errors:
     *   400 - validation or bad request
     *   404 - referenced household not found
     *   409 - conflict (unique constraint)
     *   500 - unexpected server error
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid BoardDTO dto) {
        try {
            Board created = service.create(dto);
            BoardDTO body = service.toDto(created);
            URI location = URI.create("/api/boards/" + created.getId());
            // created(...) already sets Location header
            return ResponseEntity.created(location).body(body);
        } catch (DataIntegrityViolationException ex) {
            log.warn("Data integrity violation on create Board: {}", ex.getMessage());
            return error(HttpStatus.CONFLICT, "Resource conflict (possible duplicate)");
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() == null ? "" : ex.getMessage();
            if (msg.toLowerCase().contains("not found")) {
                return error(HttpStatus.NOT_FOUND, msg);
            }
            return error(HttpStatus.BAD_REQUEST, msg);
        } catch (Exception ex) {
            log.error("Unexpected error while creating board: {}", ex.getMessage(), ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * DELETE /api/boards/{id}
     * Success: 204 No Content when deleted
     * Errors:
     *   404 - board not found
     *   500 - unexpected server error
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            boolean deleted = service.deleteById(id);
            if (deleted) {
                return ResponseEntity.noContent().build();
            } else {
                return error(HttpStatus.NOT_FOUND, "Board not found with id=" + id);
            }
        } catch (Exception ex) {
            log.error("Unexpected error while deleting board id={}", id, ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * GET /api/boards/household/{householdId}/year/{year}/month/{month}
     * If board exists -> 200 OK with DTO
     * If created -> 201 Created with Location header and DTO body
     * Errors:
     *   400/404/409/500 similar to create/get
     */
    @GetMapping("/household/{householdId}/year/{year}/month/{month}")
    public ResponseEntity<?> getOrCreate(@PathVariable Long householdId,
                                         @PathVariable int year,
                                         @PathVariable int month) {
        try {
            BoardService.BoardAndCreated result = service.getOrCreateWithFlag(householdId, year, month);
            Board board = result.getBoard();
            BoardDTO dto = service.toDto(board);
            if (result.isCreated()) {
                URI location = URI.create("/api/boards/" + board.getId());
                return ResponseEntity.created(location).body(dto);
            } else {
                return ResponseEntity.ok(dto);
            }
        } catch (DataIntegrityViolationException ex) {
            log.warn("Data integrity violation on getOrCreate board: {}", ex.getMessage());
            return error(HttpStatus.CONFLICT, "Resource conflict (possible duplicate)");
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() == null ? "" : ex.getMessage();
            if (msg.toLowerCase().contains("not found")) {
                return error(HttpStatus.NOT_FOUND, msg);
            }
            return error(HttpStatus.BAD_REQUEST, msg);
        } catch (Exception ex) {
            log.error("Unexpected error while getOrCreate board: {}", ex.getMessage(), ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    /**
     * GET /api/boards/household/{householdId}
     * Returns list of boards for household -> 200 OK
     * Errors:
     *   400 - bad request
     *   500 - unexpected server error
     */
    @GetMapping("/household/{householdId}")
    public ResponseEntity<?> listByHousehold(@PathVariable Long householdId) {
        try {
            List<BoardDTO> list = service.getBoardsByHousehold(householdId);
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException ex) {
            return error(HttpStatus.BAD_REQUEST, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error while listing boards for household {}: {}", householdId, ex.getMessage(), ex);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    // ----------------------
    // Helpers
    // ----------------------
    private ResponseEntity<ErrorPayload> error(HttpStatus status, String message) {
        ErrorPayload payload = new ErrorPayload(status.value(), message == null ? status.getReasonPhrase() : message);
        return ResponseEntity.status(status).body(payload);
    }

    // Simple error payload for JSON responses
    public static class ErrorPayload {
        private final int status;
        private final String message;

        public ErrorPayload(int status, String message) {
            this.status = status;
            this.message = message;
        }

        public int getStatus() { return status; }
        public String getMessage() { return message; }
    }
}
