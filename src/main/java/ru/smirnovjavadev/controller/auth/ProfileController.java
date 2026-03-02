package ru.smirnovjavadev.controller.auth;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import ru.smirnovjavadev.domain.auth.User;
import ru.smirnovjavadev.service.auth.CurrentUserService;

@Controller
public class ProfileController {

    private final CurrentUserService currentUserService;

    public ProfileController(CurrentUserService currentUserService) {
        this.currentUserService = currentUserService;
    }

    @GetMapping("/profile")
    public String profile(Model model) {
        User user = currentUserService.getCurrentUser()
                .orElseThrow(() -> new IllegalArgumentException("User not authenticated"));

        model.addAttribute("user", user);
        model.addAttribute("household", user.getHousehold());
        model.addAttribute("member", user.getMember());
        model.addAttribute("isAdmin", currentUserService.isHouseholdAdmin());

        return "auth/profile";
    }
}