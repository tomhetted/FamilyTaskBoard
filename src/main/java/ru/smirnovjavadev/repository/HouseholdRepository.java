package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.Household;

public interface HouseholdRepository extends JpaRepository<Household, Long> {

}
