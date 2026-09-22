package com.homestock.user;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.homestock.auth.AuthDtos.UserInfo;
import com.homestock.auth.AuthService;
import com.homestock.auth.CurrentUser;
import com.homestock.common.ApiException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.transaction.Transactional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    public record SettingsRequest(@NotBlank @Size(max = 60) String timezone) {}

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public UserInfo me(@AuthenticationPrincipal CurrentUser current) {
        return AuthService.toUserInfo(find(current));
    }

    @PutMapping("/me/settings")
    @Transactional
    public UserInfo updateSettings(@AuthenticationPrincipal CurrentUser current,
                                   @Valid @RequestBody SettingsRequest request) {
        User user = find(current);
        user.setTimezone(request.timezone());
        return AuthService.toUserInfo(userRepository.save(user));
    }

    private User find(CurrentUser current) {
        return userRepository.findById(current.id())
                .orElseThrow(() -> ApiException.notFound("User not found"));
    }
}
