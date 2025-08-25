package ru.smirnovjavadev.dto;

import lombok.Builder;
import ru.smirnovjavadev.domain.Board;

@Builder
public class BoardDTO {

    private Long id;
    private String title;
    private int year;
    private int month;
    private Long householdId;

    public BoardDTO() {}

    public BoardDTO(Long id, String title, int year, int month, Long householdId) {
        this.id = id;
        this.title = title;
        this.year = year;
        this.month = month;
        this.householdId = householdId;
    }

    public static BoardDTO fromEntity(Board board) {
        return new BoardDTO(
                board.getId(),
                board.getTitle(),
                board.getYear(),
                board.getMonth(),
                board.getHousehold() != null ? board.getHousehold().getId() : null
        );
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public Long getHouseholdId() { return householdId; }
    public void setHouseholdId(Long householdId) { this.householdId = householdId; }
}
