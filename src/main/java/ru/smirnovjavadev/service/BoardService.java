package ru.smirnovjavadev.service;

import org.springframework.stereotype.Service;
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

    public Board getById(Long id) {
        return boardRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Board not found"));
    }

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

    public Board getOrCreate(Long householdId, int year, int month) {
        return boardRepository.findByHouseholdIdAndYearAndMonth(householdId, year, month)
                .orElseGet(() -> create(BoardDTO.builder()
                        .householdId(householdId)
                        .year(year)
                        .month(month)
                        .title("Board " + month + "/" + year)
                        .build()));
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
}
