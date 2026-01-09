package ru.smirnovjavadev.service.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.domain.auth.User;
import ru.smirnovjavadev.domain.auth.UserRole;
import ru.smirnovjavadev.dto.auth.RegisterRequest;
import ru.smirnovjavadev.dto.auth.UserDTO;
import ru.smirnovjavadev.exception.ResourceNotFoundException;
import ru.smirnovjavadev.repository.HouseholdRepository;
import ru.smirnovjavadev.repository.MemberRepository;
import ru.smirnovjavadev.repository.UserRepository;

import java.time.LocalDateTime;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final Logger log = LoggerFactory.getLogger(UserService.class);

    public UserService(UserRepository userRepository,
                       HouseholdRepository householdRepository,
                       MemberRepository memberRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.householdRepository = householdRepository;
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    @Transactional(readOnly = true)
    public UserDTO getCurrentUserDto(CustomUserDetailsService.CustomUserDetails userDetails) {
        if (userDetails == null) return null;
        return UserDTO.fromEntity(userDetails.getUser());
    }

    @Transactional
    public User register(RegisterRequest request) {
        // Валидация
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Пароли не совпадают");
        }

        // Проверка уникальности username и email
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Пользователь с таким именем уже существует");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Пользователь с таким email уже существует");
        }

        // Создаем домохозяйство
        Household household = Household.builder()
                .name(request.getHouseholdName())
                .build();
        household = householdRepository.save(household);

        // Создаем участника
        Member member = Member.builder()
                .name(request.getMemberName())
                .household(household)
                .build();
        member = memberRepository.save(member);

        // Создаем пользователя
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .household(household)
                .member(member)
                .role(UserRole.ROLE_HOUSEHOLD_ADMIN) // Первый пользователь - администратор
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build();

        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            log.error("Ошибка при регистрации пользователя", e);
            throw new IllegalArgumentException("Ошибка при создании пользователя");
        }
    }

    @Transactional(readOnly = true)
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}