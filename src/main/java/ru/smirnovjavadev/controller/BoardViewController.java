package ru.smirnovjavadev.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import ru.smirnovjavadev.domain.Board;
import ru.smirnovjavadev.service.BoardService;

@Controller
@RequestMapping("/boards")
public class BoardViewController {

    private final BoardService boardService;

    public BoardViewController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping("/{id}")
    public String viewBoard(@PathVariable Long id, Model model) {
        Board board = boardService.getById(id);
        model.addAttribute("board", board); // <--- вот так

        return "board";
    }
}
