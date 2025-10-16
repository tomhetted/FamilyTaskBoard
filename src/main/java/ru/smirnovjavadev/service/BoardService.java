package ru.smirnovjavadev.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.dto.BoardDTO;
import ru.smirnovjavadev.repository.BoardRepository;
import ru.smirnovjavadev.repository.HouseholdRepository;

import java.util.Optional;

@Service
public class BoardService {

    private final BoardRepository boardRepository;
    private final HouseholdRepository householdRepository;

    public BoardService(BoardRepository boardRepository, HouseholdRepository householdRepository) {
        this.boardRepository = boardRepository;
        this.householdRepository = householdRepository;
    }

    @Transactional(readOnly = true)
    public Board getById(Long id) {
        return boardRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));
    }

    @Transactional
    public Board create(BoardDTO dto) {
        Board board = Board.builder()
                .household(householdRepository.findById(dto.getHouseholdId())
                        .orElseThrow(() -> new IllegalArgumentException("Household not found")))
                .year(dto.getYear())
                .month(dto.getMonth())
                .title(dto.getTitle())
                .build();

        return boardRepository.save(board);
    }

    @Transactional
    public Board getOrCreate(Long householdId, int year, int month) {
        return boardRepository.findByHouseholdIdAndYearAndMonth(householdId, year, month)
                .orElseGet(() -> {
                    BoardDTO dto = BoardDTO.builder()
                            .householdId(householdId)
                            .year(year)
                            .month(month)
                            .title("Board " + month + "/" + year)
                            .build();
                    try {
                        return create(dto);
                    } catch (DataIntegrityViolationException ex) {
                        // конкурентная вставка — читаем уже созданную запись
                        return boardRepository.findByHouseholdIdAndYearAndMonth(householdId, year, month)
                                .orElseThrow(() -> ex);
                    }
                });
    }

    // Добавляем метод для преобразования entity в DTO
    public BoardDTO toDto(Board board) {
        return BoardDTO.builder()
                .id(board.getId())
                .householdId(board.getHousehold() != null ? board.getHousehold().getId() : null)
                .year(board.getYear())
                .month(board.getMonth())
                .title(board.getTitle())
                .build();
    }

    public Optional<Board> findAny() {
        return boardRepository.findAll().stream().findFirst();
    }
}
