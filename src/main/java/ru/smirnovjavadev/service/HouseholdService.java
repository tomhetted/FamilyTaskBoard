package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.repository.HouseholdRepository;

import java.util.List;

@Service
public class HouseholdService {

    private final HouseholdRepository householdRepository;

    public HouseholdService(HouseholdRepository householdRepository) {
        this.householdRepository = householdRepository;
    }

    @Transactional(readOnly = true)
    public Household getById(Long id) {
        return householdRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Household not found"));
    }

    @Transactional
    public Household create(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (householdRepository.existsByName(name)) {
            throw new IllegalArgumentException("Household with this name already exists");
        }

        Household household = Household.builder()
                .name(name)
                .build();
        return householdRepository.save(household);
    }

    @Transactional(readOnly = true)
    public List<Household> getAll() {
        return householdRepository.findAll();
    }
}
