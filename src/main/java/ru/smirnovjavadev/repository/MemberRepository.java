package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.Member;

import java.util.List;

public interface MemberRepository extends JpaRepository<Member, Long> {

    List<Member> findAllByHouseholdId(Long householdId);

    // удобный метод для проверки дубликатов
    boolean existsByHouseholdIdAndName(Long householdId, String name);

    // удобный упорядоченный метод для UI
    List<Member> findAllByHouseholdIdOrderByNameAsc(Long householdId);
}
