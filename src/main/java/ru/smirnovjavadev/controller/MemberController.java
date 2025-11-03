package ru.smirnovjavadev.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.MemberDTO;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.service.MemberService;


import javax.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/members")
@Validated
public class MemberController {

    private final MemberService service;
    private final Logger log = LoggerFactory.getLogger(MemberController.class);

    public MemberController(MemberService service) {
        this.service = service;
    }

    // GET /api/members -> 200
    @GetMapping
    public ResponseEntity<List<MemberDTO>> all() {
        List<MemberDTO> list = service.getAll().stream()
                .map(MemberDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // GET /api/members/household/{householdId} -> 200
    @GetMapping("/household/{householdId}")
    public ResponseEntity<List<MemberDTO>> allByHousehold(@PathVariable Long householdId) {
        List<MemberDTO> list = service.getAllByHousehold(householdId).stream()
                .map(MemberDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // GET /api/members/{id} -> 200 / 404
    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id) {
        try {
            Member m = service.getById(id);
            return ResponseEntity.ok(MemberDTO.fromEntity(m));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, ex.getMessage()));
        } catch (Exception ex) {
            log.error("Unexpected error while fetching member {}", id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error(500, "Internal server error"));
        }
    }

    // POST /api/members -> 201 Created (Location) or 400/409/500
    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid MemberDTO dto) {
        try {
            Member m = service.create(dto.getHouseholdId(), dto.getName());
            MemberDTO body = MemberDTO.fromEntity(m);
            URI location = URI.create("/api/members/" + m.getId());
            HttpHeaders headers = new HttpHeaders();
            headers.setLocation(location);
            return ResponseEntity.created(location).headers(headers).body(body);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error(400, ex.getMessage()));
        } catch (DataIntegrityViolationException ex) {
            // unique constraint violation at DB level
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error(409, "Conflict creating member"));
        } catch (Exception ex) {
            log.error("Unexpected error while creating member", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error(500, "Internal server error"));
        }
    }

    // DELETE /api/members/{id} -> 204 / 404 / 500
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            service.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(404, ex.getMessage()));
        } catch (Exception ex) {
            log.error("Unexpected error while deleting member {}", id, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(error(500, "Internal server error"));
        }
    }

    private static ErrorPayload error(int status, String message) {
        return new ErrorPayload(status, message == null ? "" : message);
    }

    public static class ErrorPayload {
        private final int status;
        private final String message;
        public ErrorPayload(int status, String message) { this.status = status; this.message = message; }
        public int getStatus() { return status; }
        public String getMessage() { return message; }
    }
}
