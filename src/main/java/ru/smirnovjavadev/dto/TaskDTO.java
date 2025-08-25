package ru.smirnovjavadev.dto;

import lombok.Builder;
import lombok.Data;
import ru.smirnovjavadev.domain.Task;
import ru.smirnovjavadev.domain.TaskStatus;

import java.time.LocalDate;

@Data
@Builder
public class TaskDTO {

    private Long id;
    private Long boardId;
    private Long memberId;
    private String memberName;
    private LocalDate date;
    private String description;
    private TaskStatus status;

    // Метод конвертации из entity в DTO
    public static TaskDTO fromEntity(Task task) {
        if (task == null) return null;

        return TaskDTO.builder()
                .id(task.getId())
                .boardId(task.getBoard() != null ? task.getBoard().getId() : null)
                .memberId(task.getMember() != null ? task.getMember().getId() : null)
                .memberName(task.getMember() != null ? task.getMember().getName() : null)
                .date(task.getDate())
                .description(task.getDescription())
                .status(task.getStatus())
                .build();
    }
}
