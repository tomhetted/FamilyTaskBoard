package ru.smirnovjavadev.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.HouseholdDTO;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.service.HouseholdService;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/households")
public class HouseholdController {

    private final HouseholdService service;

    public HouseholdController(HouseholdService service) {
        this.service = service;
    }

    @GetMapping
    public List<HouseholdDTO> all() {
        return service.getAll().stream()
                .map(HouseholdDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HouseholdDTO> get(@PathVariable Long id) {
        Household h = service.getById(id);
        return ResponseEntity.ok(HouseholdDTO.fromEntity(h));
    }

    @PostMapping
    public ResponseEntity<HouseholdDTO> create(@RequestBody HouseholdDTO dto) {
        Household h = service.create(dto.getName());
        return ResponseEntity.ok(HouseholdDTO.fromEntity(h));
    }
}
