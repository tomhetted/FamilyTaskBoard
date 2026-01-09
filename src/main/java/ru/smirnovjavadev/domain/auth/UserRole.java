package ru.smirnovjavadev.domain.auth;

public enum UserRole {
    ROLE_HOUSEHOLD_ADMIN,  // Администратор домохозяйства
    ROLE_MEMBER            // Обычный участник

    // Примечание: Spring Security требует префикс "ROLE_"
}