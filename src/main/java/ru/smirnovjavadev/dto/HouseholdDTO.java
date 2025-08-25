package ru.smirnovjavadev.dto;

import ru.smirnovjavadev.domain.Household;

public class HouseholdDTO {

    private Long id;
    private String name;

    public HouseholdDTO() {}

    public HouseholdDTO(Long id, String name) {
        this.id = id;
        this.name = name;
    }

    public static HouseholdDTO fromEntity(Household household) {
        return new HouseholdDTO(household.getId(), household.getName());
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
