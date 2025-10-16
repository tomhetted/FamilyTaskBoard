package ru.smirnovjavadev.dto;

import ru.smirnovjavadev.domain.Member;

import javax.validation.constraints.NotBlank;

public class MemberDTO {

    private Long id;

    @NotBlank(message = "name must not be blank")
    private String name;

    private Long householdId;

    public MemberDTO() {}

    public MemberDTO(Long id, String name, Long householdId) {
        this.id = id;
        this.name = name;
        this.householdId = householdId;
    }

    public static MemberDTO fromEntity(Member m) {
        MemberDTO dto = new MemberDTO();
        dto.setId(m.getId());
        dto.setName(m.getName());
        dto.setHouseholdId(m.getHousehold() != null ? m.getHousehold().getId() : null);
        return dto;
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getHouseholdId() { return householdId; }
    public void setHouseholdId(Long householdId) { this.householdId = householdId; }
}
