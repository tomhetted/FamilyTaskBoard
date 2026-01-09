package ru.smirnovjavadev.controller.auth;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import ru.smirnovjavadev.dto.auth.LoginRequest;
import ru.smirnovjavadev.dto.auth.RegisterRequest;
import ru.smirnovjavadev.service.auth.UserService;

@Controller
public class AuthController {

    private final UserService userService;
    private final Logger log = LoggerFactory.getLogger(AuthController.class);

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/login")
    public String showLoginForm(Model model) {
        model.addAttribute("loginRequest", new LoginRequest());
        return "auth/login";
    }

    @GetMapping("/register")
    public String showRegisterForm(Model model) {
        model.addAttribute("registerRequest", new RegisterRequest());
        return "auth/register";
    }

    @PostMapping("/register")
    public String register(@Valid @ModelAttribute("registerRequest") RegisterRequest request,
                           BindingResult bindingResult,
                           Model model) {
        if (bindingResult.hasErrors()) {
            return "auth/register";
        }

        try {
            userService.register(request);
            return "redirect:/login?registered=true";
        } catch (IllegalArgumentException e) {
            model.addAttribute("error", e.getMessage());
            return "auth/register";
        } catch (Exception e) {
            log.error("Ошибка при регистрации", e);
            model.addAttribute("error", "Произошла ошибка при регистрации");
            return "auth/register";
        }
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/boards";
    }
}