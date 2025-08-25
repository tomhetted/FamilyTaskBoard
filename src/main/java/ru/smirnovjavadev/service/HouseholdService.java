package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.repository.HouseholdRepository;

import java.util.List;

@Service
public class HouseholdService {

    private final HouseholdRepository householdRepository;

    public HouseholdService(HouseholdRepository householdRepository) {
        this.householdRepository = householdRepository;
    }

    public Household getById(Long id) {
        return householdRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Household not found"));
    }

    public Household create(String name) {
        Household household = Household.builder()
                .name(name)
                .build();
        return householdRepository.save(household);
    }

    public List<Household> getAll() {
        return householdRepository.findAll();
    }
}
