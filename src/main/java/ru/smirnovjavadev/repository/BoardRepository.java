package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.Board;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BoardRepository extends JpaRepository<Board, Long> {

    List<Board> findAllByHouseholdIdOrderByYearDescMonthDesc(Long householdId);

    Optional<Board> findByHouseholdIdAndYearAndMonth(Long householdId, int year, int month);

    List<Board> findByHouseholdId(Long householdId);

    List<Board> findAllByHouseholdId(Long householdId);

    // в BoardRepository
    Optional<Board> findFirstByOrderByIdAsc();

}
