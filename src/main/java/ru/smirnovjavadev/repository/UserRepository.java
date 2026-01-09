package ru.smirnovjavadev.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.smirnovjavadev.domain.auth.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsernameAndHouseholdId(String username, Long householdId);
}