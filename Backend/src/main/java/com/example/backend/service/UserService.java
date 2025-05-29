package com.example.backend.service;

import com.example.backend.dto.ChangePasswordRequest;
import java.util.UUID;

public interface UserService {
    void changePassword(UUID userId, ChangePasswordRequest changePasswordRequest);
    void deleteUser(UUID userId);
}
