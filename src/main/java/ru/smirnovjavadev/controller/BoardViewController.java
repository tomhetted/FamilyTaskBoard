package ru.smirnovjavadev.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.service.BoardService;

import java.time.LocalDate;
import java.util.Optional;

@Controller
@RequestMapping("/boards")
public class BoardViewController {

    private final BoardService boardService;

    public BoardViewController(BoardService boardService) {
        this.boardService = boardService;
    }

    // /boards/ — первая доска или пустой вид
    @GetMapping({"", "/"})
    public String defaultBoard(Model model) {
        LocalDate now = LocalDate.now();
        Optional<Board> any = boardService.findAny();

        if (any.isPresent()) {
            Board board = any.get();
            model.addAttribute("board", board);
            model.addAttribute("boardId", board.getId());
            model.addAttribute("title", board.getTitle());
            // показываем текущий месяц по умолчанию (можно заменить на board.getYear()/getMonth())
            model.addAttribute("year", now.getYear());
            model.addAttribute("month", now.getMonthValue());
        } else {
            model.addAttribute("board", null);
            model.addAttribute("boardId", 0);
            model.addAttribute("title", "TaskBoard");
            model.addAttribute("year", now.getYear());
            model.addAttribute("month", now.getMonthValue());
        }

        return "board";
    }

    // /boards/{id} — конкретная доска
    @GetMapping("/{id}")
    public String viewBoard(@PathVariable Long id, Model model) {
        Board board = boardService.getById(id);

        // Если доска не содержит year/month, используем текущие
        int year = board.getYear();
        int month = board.getMonth();

        String title = (board.getTitle() != null) ? board.getTitle() : "TaskBoard";

        model.addAttribute("boardId", board.getId());
        model.addAttribute("year", year);
        model.addAttribute("month", month);
        model.addAttribute("title", title);

        return "board";
    }
}
