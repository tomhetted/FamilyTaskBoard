package ru.smirnovjavadev.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.MemberDTO;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.service.MemberService;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService service;

    public MemberController(MemberService service) {
        this.service = service;
    }

    // Получить всех участников
    @GetMapping
    public List<MemberDTO> all() {
        return service.getAll().stream()
                .map(MemberDTO::fromEntity)
                .collect(Collectors.toList());
    }

    // Получить участников конкретного household
    @GetMapping("/household/{householdId}")
    public List<MemberDTO> allByHousehold(@PathVariable Long householdId) {
        return service.getAllByHousehold(householdId).stream()
                .map(MemberDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MemberDTO> get(@PathVariable Long id) {
        Member m = service.getById(id);
        return ResponseEntity.ok(MemberDTO.fromEntity(m));
    }

    @PostMapping
    public ResponseEntity<MemberDTO> create(@RequestBody MemberDTO dto) {
        Member m = service.create(dto.getHouseholdId(), dto.getName());
        return ResponseEntity.ok(MemberDTO.fromEntity(m));
    }
}
