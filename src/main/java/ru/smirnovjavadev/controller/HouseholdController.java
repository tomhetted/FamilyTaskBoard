package ru.smirnovjavadev.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import ru.smirnovjavadev.dto.HouseholdDTO;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.service.HouseholdService;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/households")
@Validated
public class HouseholdController {

    private final HouseholdService service;

    public HouseholdController(HouseholdService service) {
        this.service = service;
    }

    /**
     * GET /api/households
     * Success: 200 OK with list of HouseholdDTO
     */
    @GetMapping
    public ResponseEntity<List<HouseholdDTO>> all() {
        List<HouseholdDTO> list = service.getAll().stream()
                .map(HouseholdDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /**
     * GET /api/households/{id}
     * Success: 200 OK with HouseholdDTO
     */
    @GetMapping("/{id}")
    public ResponseEntity<HouseholdDTO> get(@PathVariable Long id) {
        Household household = service.getById(id);
        return ResponseEntity.ok(HouseholdDTO.fromEntity(household));
    }

    /**
     * POST /api/households
     * Success: 201 Created, Location header points to new resource
     */
    @PostMapping
    public ResponseEntity<HouseholdDTO> create(@RequestBody @Valid HouseholdDTO dto) {
        Household household = service.create(dto.getName());
        HouseholdDTO body = HouseholdDTO.fromEntity(household);
        URI location = URI.create("/api/households/" + household.getId());
        return ResponseEntity.created(location).body(body);
    }

    /**
     * DELETE /api/households/{id}
     * Success: 204 No Content
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}