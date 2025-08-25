package ru.smirnovjavadev.dto;

import ru.smirnovjavadev.domain.Member;

public class MemberDTO {

    private Long id;
    private String name;
    private Long householdId; // ← добавляем

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getHouseholdId() { return householdId; }
    public void setHouseholdId(Long householdId) { this.householdId = householdId; }

    // Преобразование из Entity
    public static MemberDTO fromEntity(Member m) {
        MemberDTO dto = new MemberDTO();
        dto.setId(m.getId());
        dto.setName(m.getName());
        dto.setHouseholdId(m.getHousehold() != null ? m.getHousehold().getId() : null);
        return dto;
    }
}
