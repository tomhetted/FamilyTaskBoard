package ru.smirnovjavadev.web;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HealthController {

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("appName", "Семейная доска задач");
        return "index";
    }
}
