package ru.smirnovjavadev.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.exception.ResourceNotFoundException;
import ru.smirnovjavadev.repository.HouseholdRepository;

import java.util.List;

@Service
public class HouseholdService {

    private final HouseholdRepository householdRepository;
    private final Logger log = LoggerFactory.getLogger(HouseholdService.class);

    public HouseholdService(HouseholdRepository householdRepository) {
        this.householdRepository = householdRepository;
    }

    @Transactional(readOnly = true)
    public Household getById(Long id) {
        return householdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Household", "id", id));
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

    @Transactional
    public void delete(Long id) {
        log.debug("Deleting household with id={}", id);

        if (id == null) {
            throw new IllegalArgumentException("Household id cannot be null");
        }

        if (!householdRepository.existsById(id)) {
            throw new ResourceNotFoundException("Household", "id", id);
        }

        try {
            householdRepository.deleteById(id);
            log.info("Deleted household id={}", id);
        } catch (DataIntegrityViolationException ex) {
            // например, если в household ещё есть зависимые записи (members, boards)
            log.error("Cannot delete household id={}, integrity violation: {}", id, ex.getMessage());
            throw new IllegalArgumentException("Cannot delete household: it has related data");
        } catch (Exception ex) {
            log.error("Unexpected error deleting household id={}", id, ex);
            throw ex;
        }
    }


    @Transactional(readOnly = true)
    public List<Household> getAll() {
        return householdRepository.findAll();
    }
}