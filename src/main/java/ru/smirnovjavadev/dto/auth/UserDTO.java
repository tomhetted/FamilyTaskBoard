package ru.smirnovjavadev.dto.auth;

import ru.smirnovjavadev.domain.auth.User;

public class UserDTO {

    private Long id;
    private String username;
    private String email;
    private String role;
    private Long householdId;
    private Long memberId;
    private String memberName;
    private String householdName;

    public static UserDTO fromEntity(User user) {
        if (user == null) return null;

        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole().name());
        dto.setHouseholdId(user.getHousehold() != null ? user.getHousehold().getId() : null);
        dto.setHouseholdName(user.getHousehold() != null ? user.getHousehold().getName() : null);
        dto.setMemberId(user.getMember() != null ? user.getMember().getId() : null);
        dto.setMemberName(user.getMember() != null ? user.getMember().getName() : null);

        return dto;
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Long getHouseholdId() { return householdId; }
    public void setHouseholdId(Long householdId) { this.householdId = householdId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getHouseholdName() { return householdName; }
    public void setHouseholdName(String householdName) { this.householdName = householdName; }
}