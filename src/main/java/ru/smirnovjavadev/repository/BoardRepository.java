package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.Board;

import java.util.List;
import java.util.Optional;

public interface BoardRepository extends JpaRepository<Board, Long> {

    List<Board> findAllByHouseholdId(Long householdId);

    Optional<Board> findByHouseholdIdAndYearAndMonth(Long householdId, int year, int month);
}
