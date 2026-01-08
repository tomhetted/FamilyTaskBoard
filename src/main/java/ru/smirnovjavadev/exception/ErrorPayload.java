package ru.smirnovjavadev.exception;

import java.time.LocalDateTime;

public class ErrorPayload {
    private final int status;
    private final String message;
    private final LocalDateTime timestamp;
    private final String path;

    public ErrorPayload(int status, String message, String path) {
        this.status = status;
        this.message = message;
        this.timestamp = LocalDateTime.now();
        this.path = path;
    }

    // Геттеры
    public int getStatus() { return status; }
    public String getMessage() { return message; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public String getPath() { return path; }
}