package ru.smirnovjavadev.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "task")
@AllArgsConstructor
@Builder
@NoArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = true)
    private Member member;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private TaskStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false)
    @Builder.Default
    private TaskType taskType = TaskType.REGULAR;

    @Column(name = "week_day")
    private Integer weekDay; // 1-понедельник, ..., 7-воскресенье

    // Валидация: для ROUTINE задач weekDay обязателен
    @PrePersist
    @PreUpdate
    private void validate() {
        if (taskType == TaskType.ROUTINE && weekDay == null) {
            throw new IllegalStateException("Рутинные задачи требуют указания дня недели");
        }
        if (taskType == TaskType.REGULAR && weekDay != null) {
            throw new IllegalStateException("Обычные задачи не должны иметь день недели");
        }
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }

    public Member getMember() { return member; }
    public void setMember(Member member) { this.member = member; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public TaskStatus getStatus() { return status; }
    public void setStatus(TaskStatus status) { this.status = status; }

    public TaskType getTaskType() { return taskType; }
    public void setTaskType(TaskType taskType) { this.taskType = taskType; }

    public Integer getWeekDay() { return weekDay; }
    public void setWeekDay(Integer weekDay) { this.weekDay = weekDay; }
}
