package ru.smirnovjavadev.service.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.domain.Household;
import ru.smirnovjavadev.domain.Member;
import ru.smirnovjavadev.domain.auth.User;
import ru.smirnovjavadev.domain.auth.UserRole;
import ru.smirnovjavadev.repository.BoardRepository;
import ru.smirnovjavadev.repository.UserRepository;

import java.util.Optional;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;

    public CurrentUserService(UserRepository userRepository, BoardRepository boardRepository) {
        this.userRepository = userRepository;
        this.boardRepository = boardRepository;
    }

    /**
     * Получение текущего аутентифицированного пользователя
     */
    public Optional<User> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        String username = authentication.getName();
        return userRepository.findByUsername(username);
    }

    /**
     * Получение ID текущего пользователя
     */
    public Optional<Long> getCurrentUserId() {
        return getCurrentUser().map(User::getId);
    }

    /**
     * Получение текущего домохозяйства пользователя
     */
    public Optional<Household> getCurrentHousehold() {
        return getCurrentUser()
                .map(User::getHousehold);
    }

    /**
     * Получение ID текущего домохозяйства
     */
    public Optional<Long> getCurrentHouseholdId() {
        return getCurrentUser()
                .map(User::getHousehold)
                .map(Household::getId);
    }

    /**
     * Получение текущего участника (Member) пользователя
     */
    public Optional<Member> getCurrentMember() {
        return getCurrentUser()
                .map(User::getMember);
    }

    /**
     * Получение ID текущего участника
     */
    public Optional<Long> getCurrentMemberId() {
        return getCurrentUser()
                .map(User::getMember)
                .map(Member::getId);
    }

    /**
     * Проверка, является ли пользователь администратором своего домохозяйства
     */
    public boolean isHouseholdAdmin() {
        return getCurrentUser()
                .map(user -> user.getRole() == UserRole.ROLE_HOUSEHOLD_ADMIN)
                .orElse(false);
    }

    /**
     * Проверка, является ли пользователь администратором указанного домохозяйства
     */
    public boolean isAdminOfHousehold(Long householdId) {
        if (householdId == null) return false;
        return getCurrentUser()
                .map(user -> user.getRole() == UserRole.ROLE_HOUSEHOLD_ADMIN
                        && user.getHousehold() != null
                        && user.getHousehold().getId().equals(householdId))
                .orElse(false);
    }

    /**
     * Проверка, является ли пользователь администратором домохозяйства, которому принадлежит доска
     */
    public boolean isAdminOfBoardHousehold(Long boardId) {
        if (boardId == null) return false;
        Optional<Board> boardOpt = boardRepository.findById(boardId);
        if (boardOpt.isEmpty()) return false;
        Board board = boardOpt.get();
        return isAdminOfHousehold(board.getHousehold().getId());
    }

    /**
     * Проверка, принадлежит ли домохозяйство текущему пользователю
     */
    public boolean isUserInHousehold(Long householdId) {
        if (householdId == null) return false;
        return getCurrentHouseholdId()
                .map(id -> id.equals(householdId))
                .orElse(false);
    }
}