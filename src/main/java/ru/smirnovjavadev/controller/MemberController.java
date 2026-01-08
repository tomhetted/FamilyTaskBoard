package ru.smirnovjavadev.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.MemberDTO;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.service.MemberService;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/members")
@Validated
public class MemberController {

    private final MemberService service;

    public MemberController(MemberService service) {
        this.service = service;
    }

    /**
     * GET /api/members
     * Success: 200 OK with list of MemberDTO
     */
    @GetMapping
    public ResponseEntity<List<MemberDTO>> all() {
        List<MemberDTO> list = service.getAll().stream()
                .map(MemberDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /**
     * GET /api/members/household/{householdId}
     * Success: 200 OK with list of MemberDTO
     */
    @GetMapping("/household/{householdId}")
    public ResponseEntity<List<MemberDTO>> allByHousehold(@PathVariable Long householdId) {
        List<MemberDTO> list = service.getAllByHousehold(householdId).stream()
                .map(MemberDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /**
     * GET /api/members/{id}
     * Success: 200 OK with MemberDTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<MemberDTO> get(@PathVariable Long id) {
        Member member = service.getById(id);
        return ResponseEntity.ok(MemberDTO.fromEntity(member));
    }

    /**
     * POST /api/members
     * Success: 201 Created, Location header to new member
     */
    @PostMapping
    public ResponseEntity<MemberDTO> create(@RequestBody @Valid MemberDTO dto) {
        Member member = service.create(dto.getHouseholdId(), dto.getName());
        MemberDTO body = MemberDTO.fromEntity(member);
        URI location = URI.create("/api/members/" + member.getId());
        return ResponseEntity.created(location).body(body);
    }

    /**
     * DELETE /api/members/{id}
     * Success: 204 No Content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}