package ru.smirnovjavadev.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.BoardDTO;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.service.BoardService;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/boards")
@Validated
public class BoardController {

    private final BoardService service;

    public BoardController(BoardService service) {
        this.service = service;
    }

    /**
     * GET /api/boards/{id}
     * Success: 200 OK with BoardDTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<BoardDTO> get(@PathVariable Long id) {
        Board board = service.getById(id);
        return ResponseEntity.ok(BoardDTO.fromEntity(board));
    }

    /**
     * POST /api/boards
     * Success: 201 Created, Location header points to new resource, body contains created DTO
     */
    @PostMapping
    public ResponseEntity<BoardDTO> create(@RequestBody @Valid BoardDTO dto) {
        Board created = service.create(dto);
        BoardDTO body = BoardDTO.fromEntity(created);
        URI location = URI.create("/api/boards/" + created.getId());
        return ResponseEntity.created(location).body(body);
    }

    /**
     * DELETE /api/boards/{id}
     * Success: 204 No Content when deleted
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /api/boards/household/{householdId}/year/{year}/month/{month}
     * If board exists -> 200 OK with DTO
     * If created -> 201 Created with Location header and DTO body
     */
    @GetMapping("/household/{householdId}/year/{year}/month/{month}")
    public ResponseEntity<BoardDTO> getOrCreate(@PathVariable Long householdId,
                                                @PathVariable int year,
                                                @PathVariable int month) {
        BoardService.BoardAndCreated result = service.getOrCreateWithFlag(householdId, year, month);
        Board board = result.getBoard();
        BoardDTO dto = BoardDTO.fromEntity(board);

        if (result.isCreated()) {
            URI location = URI.create("/api/boards/" + board.getId());
            return ResponseEntity.created(location).body(dto);
        } else {
            return ResponseEntity.ok(dto);
        }
    }

    /**
     * GET /api/boards/household/{householdId}
     * Returns list of boards for household -> 200 OK
     */
    @GetMapping("/household/{householdId}")
    public ResponseEntity<List<BoardDTO>> listByHousehold(@PathVariable Long householdId) {
        List<BoardDTO> list = service.getBoardsByHousehold(householdId);
        return ResponseEntity.ok(list);
    }
}