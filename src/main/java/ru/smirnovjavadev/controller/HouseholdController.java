package ru.smirnovjavadev.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.HouseholdDTO;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.service.HouseholdService;

import javax.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/households")
@Validated
public class HouseholdController {

    private final HouseholdService service;
    private final Logger log = LoggerFactory.getLogger(HouseholdController.class);

    public HouseholdController(HouseholdService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<HouseholdDTO>> all() {
        List<HouseholdDTO> list = service.getAll().stream()
                .map(HouseholdDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        try {
            Household h = service.getById(id);
            return ResponseEntity.ok(HouseholdDTO.fromEntity(h));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorPayload(404, ex.getMessage()));
        } catch (Exception ex) {
            log.error("Error getting household {}", id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorPayload(500, "Internal server error"));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid HouseholdDTO dto) {
        try {
            Household h = service.create(dto.getName());
            HouseholdDTO body = HouseholdDTO.fromEntity(h);
            URI location = URI.create("/api/households/" + h.getId());
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(location);
            return ResponseEntity.created(location).headers(headers).body(body);
        } catch (IllegalArgumentException ex) {
            // duplicate or validation error -> 400 (or 409 if you prefer)
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorPayload(400, ex.getMessage()));
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorPayload(409, "Conflict creating household"));
        } catch (Exception ex) {
            log.error("Error creating household", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorPayload(500, "Internal server error"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            // возвращаем 204 без тела — REST стандарт
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            String msg = ex.getMessage() != null ? ex.getMessage() : "Invalid request";
            if (msg.toLowerCase().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorPayload(404, msg));
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorPayload(400, msg));
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorPayload(409, "Cannot delete household with related data"));
        } catch (Exception ex) {
            log.error("Unexpected error while deleting household {}", id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorPayload(500, "Internal server error"));
        }
    }


    private static ErrorPayload errorPayload(int status, String message) {
        return new ErrorPayload(status, message);
    }

    public static class ErrorPayload {
        private final int status;
        private final String message;
        public ErrorPayload(int status, String message) { this.status = status; this.message = message; }
        public int getStatus() { return status; }
        public String getMessage() { return message; }
    }
}
