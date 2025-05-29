package com.example.backend.service;

import com.example.backend.dto.JwtAuthenticationResponse;
import com.example.backend.dto.LoginRequest;
import com.example.backend.dto.SignUpRequest;
import com.example.backend.dto.TokenRefreshRequest;

public interface AuthService {
    String registerUser(SignUpRequest signUpRequest);
    JwtAuthenticationResponse authenticateUser(LoginRequest loginRequest);
    JwtAuthenticationResponse refreshToken(TokenRefreshRequest tokenRefreshRequest);
}