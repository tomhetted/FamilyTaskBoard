package ru.smirnovjavadev.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.BoardDTO;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.service.BoardService;

@RestController
@RequestMapping("/api/boards")
public class BoardController {

    private final BoardService service;

    public BoardController(BoardService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResponseEntity<BoardDTO> get(@PathVariable Long id) {
        Board board = service.getById(id);
        return ResponseEntity.ok(service.toDto(board));
    }

    @PostMapping
    public ResponseEntity<BoardDTO> create(@RequestBody BoardDTO dto) {
        Board board = service.create(dto);
        return ResponseEntity.ok(service.toDto(board));
    }

    @GetMapping("/household/{householdId}/year/{year}/month/{month}")
    public ResponseEntity<BoardDTO> getOrCreate(@PathVariable Long householdId,
                                                @PathVariable int year,
                                                @PathVariable int month) {
        Board board = service.getOrCreate(householdId, year, month);
        return ResponseEntity.ok(service.toDto(board));
    }

}
