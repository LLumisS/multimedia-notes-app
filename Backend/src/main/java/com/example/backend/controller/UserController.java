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
    @PreAuthorize("#id.equals(authentication.principal.id.toString()) or hasRole('ADMIN')") // User can change own password, or admin
    public ResponseEntity<?> changePassword(@PathVariable UUID id,
                                            @Valid @RequestBody ChangePasswordRequest changePasswordRequest,
                                            @AuthenticationPrincipal UserDetailsImpl currentUser) {
        // Double check ensuring user is changing their own password or is admin
        if (!currentUser.getId().equals(id) /* && !currentUser.getAuthorities()... check for admin role */ ) {
            // This check might be redundant due to @PreAuthorize but good for clarity or if @PreAuthorize is complex
            return ResponseEntity.status(403).body(new MessageResponse("Error: You are not authorized to change this user's password."));
        }
        userService.changePassword(id, changePasswordRequest);
        return ResponseEntity.ok(new MessageResponse("Password changed successfully."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("#id.equals(authentication.principal.id.toString()) or hasRole('ADMIN')") // User can delete own account, or admin
    public ResponseEntity<?> deleteUser(@PathVariable UUID id,
                                        @AuthenticationPrincipal UserDetailsImpl currentUser) {
        if (!currentUser.getId().equals(id) /* && !currentUser.getAuthorities()... check for admin role */ ) {
            return ResponseEntity.status(403).body(new MessageResponse("Error: You are not authorized to delete this user account."));
        }
        userService.deleteUser(id);
        return ResponseEntity.ok(new MessageResponse("User account deleted successfully."));
    }
}
