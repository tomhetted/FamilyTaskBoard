package ru.smirnovjavadev.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.dto.BoardDTO;
import ru.smirnovjavadev.exception.ResourceNotFoundException;
import ru.smirnovjavadev.repository.BoardRepository;
import ru.smirnovjavadev.repository.HouseholdRepository;
import ru.smirnovjavadev.service.auth.CurrentUserService;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BoardService {

    private final BoardRepository boardRepository;
    private final HouseholdRepository householdRepository;
    private final CurrentUserService currentUserService;
    private final Logger log = LoggerFactory.getLogger(BoardService.class);

    public BoardService(BoardRepository boardRepository, HouseholdRepository householdRepository, CurrentUserService currentUserService) {
        this.boardRepository = boardRepository;
        this.householdRepository = householdRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public Optional<Board> findAny() {
        // Возвращаем первую доску из текущего домохозяйства
        return currentUserService.getCurrentHouseholdId()
                .flatMap(householdId -> boardRepository.findAllByHouseholdId(householdId)
                        .stream()
                        .findFirst());
    }

    @Transactional(readOnly = true)
    public Board getById(Long id) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Board", "id", id));

        // Проверка прав доступа
        checkBoardAccess(board);

        return board;
    }

    @Transactional
    public Board create(BoardDTO dto) {
        // basic validation
        if (dto == null) throw new IllegalArgumentException("Board data is required");
        if (dto.getHouseholdId() == null) throw new IllegalArgumentException("householdId is required");
        if (dto.getMonth() < 1 || dto.getMonth() > 12) throw new IllegalArgumentException("month must be 1..12");
        if (dto.getYear() < 1900) throw new IllegalArgumentException("year seems invalid");

        // check that user creates a board in his household
        Long currentHouseholdId = currentUserService.getCurrentHouseholdId()
                .orElseThrow(() -> new IllegalArgumentException("User is not associated with any household"));
        if (!currentHouseholdId.equals(dto.getHouseholdId())) throw new IllegalArgumentException("Cannot create board in another household");

        // check household exists
        var household = householdRepository.findById(dto.getHouseholdId())
                .orElseThrow(() -> new ResourceNotFoundException("Household", "id", dto.getHouseholdId()));

        // check duplicate existing board for same household/year/month
        Optional<Board> exist = boardRepository.findByHouseholdIdAndYearAndMonth(dto.getHouseholdId(), dto.getYear(), dto.getMonth());
        if (exist.isPresent()) {
            throw new DataIntegrityViolationException("Board for this household/year/month already exists");
        }

        Board board = Board.builder()
                .household(household)
                .year(dto.getYear())
                .month(dto.getMonth())
                .title(dto.getTitle())
                .build();

        return boardRepository.save(board);
    }

    /**
     * Find or create — возвращает контейнер с флагом created
     */
    @Transactional
    public BoardAndCreated getOrCreateWithFlag(Long householdId, int year, int month) {
        if (householdId == null) throw new IllegalArgumentException("householdId is required");
        if (month < 1 || month > 12) throw new IllegalArgumentException("month must be 1..12");

        // try find first
        Optional<Board> existing = boardRepository.findByHouseholdIdAndYearAndMonth(householdId, year, month);
        if (existing.isPresent()) {
            return new BoardAndCreated(existing.get(), false);
        }

        // create
        Board board = Board.builder()
                .household(householdRepository.findById(householdId)
                        .orElseThrow(() -> new ResourceNotFoundException("Household", "id", householdId)))
                .year(year)
                .month(month)
                .title("Board " + month + "/" + year)
                .build();

        try {
            Board saved = boardRepository.save(board);
            return new BoardAndCreated(saved, true);
        } catch (DataIntegrityViolationException ex) {
            // possible race (another thread created same board) — try to re-fetch and return existing
            log.warn("Race creating board for household={}, year={}, month={} -> {}", householdId, year, month, ex.getMessage());
            Optional<Board> again = boardRepository.findByHouseholdIdAndYearAndMonth(householdId, year, month);
            if (again.isPresent()) {
                return new BoardAndCreated(again.get(), false);
            }
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public List<BoardDTO> getBoardsByHousehold(Long householdId) {
        // Проверяем доступ к домохозяйству
        if (!currentUserService.isUserInHousehold(householdId)) {
            throw new IllegalArgumentException("Access denied to household");
        }

        return boardRepository.findAllByHouseholdId(householdId).stream()
                .map(BoardDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public boolean deleteById(Long id) {
        Board board = getById(id); // Проверка прав доступа

        // Дополнительная проверка для администратора
        if (!currentUserService.isHouseholdAdmin()) {
            throw new IllegalArgumentException("Only household admin can delete boards");
        }

        boardRepository.deleteById(id);
        return true;
    }

    private void checkBoardAccess(Board board) {
        Long boardHouseholdId = board.getHousehold() != null ? board.getHousehold().getId() : null;

        if (!currentUserService.isUserInHousehold(boardHouseholdId)) {
            throw new ResourceNotFoundException("Board", "id", board.getId());
        }
    }

    // small container to indicate creation
    public static class BoardAndCreated {
        private final Board board;
        private final boolean created;
        public BoardAndCreated(Board board, boolean created) {
            this.board = board;
            this.created = created;
        }
        public Board getBoard() { return board; }
        public boolean isCreated() { return created; }
    }
}