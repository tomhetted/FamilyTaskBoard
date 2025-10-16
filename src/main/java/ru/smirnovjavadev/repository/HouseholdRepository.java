package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.Household;

import java.util.Optional;

public interface HouseholdRepository extends JpaRepository<Household, Long> {

    boolean existsByName(String name);

    Optional<Household> findByName(String name);
}
