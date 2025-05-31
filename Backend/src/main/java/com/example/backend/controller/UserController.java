package com.example.backend.controller;

import com.example.backend.dto.ChangePasswordRequest;
import com.example.backend.dto.MessageResponse;
import com.example.backend.security.UserDetailsImpl;
import com.example.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PutMapping("/{id}/password")
    @PreAuthorize("#id.equals(authentication.principal.id.toString()) or hasRole('ADMIN')")
    public ResponseEntity<?> changePassword(@PathVariable UUID id,
                                            @Valid @RequestBody ChangePasswordRequest changePasswordRequest,
                                            @AuthenticationPrincipal UserDetailsImpl currentUser) {
        if (!currentUser.getId().equals(id) /* && !currentUser.getAuthorities()... check for admin role */ ) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: You are not authorized to change this user's password."));
        }
        userService.changePassword(id, changePasswordRequest);
        return ResponseEntity.ok(new MessageResponse("Password changed successfully."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("#id.equals(authentication.principal.id.toString()) or hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id,
                                        @AuthenticationPrincipal UserDetailsImpl currentUser) {
        if (!currentUser.getId().equals(id) /* && !currentUser.getAuthorities()... check for admin role */ ) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: You are not authorized to delete this user account."));
        }
        userService.deleteUser(id);
        return ResponseEntity.ok(new MessageResponse("User account deleted successfully."));
    }
}
