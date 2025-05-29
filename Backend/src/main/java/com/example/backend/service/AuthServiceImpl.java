package com.example.backend.service;

import com.example.backend.dto.JwtAuthenticationResponse;
import com.example.backend.dto.LoginRequest;
import com.example.backend.dto.SignUpRequest;
import com.example.backend.dto.TokenRefreshRequest;
import com.example.backend.entity.ERole;
import com.example.backend.entity.RefreshToken;
import com.example.backend.entity.Role;
import com.example.backend.entity.User;
import com.example.backend.exception.AppException;
import com.example.backend.exception.TokenRefreshException;
import com.example.backend.repository.RoleRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.JwtTokenProvider;
import com.example.backend.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtTokenProvider jwtTokenProvider;

    @Autowired
    RefreshTokenService refreshTokenService;

    @Override
    @Transactional
    public String registerUser(SignUpRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new AppException("Error: Email is already in use!");
        }

        User user = new User(signUpRequest.getEmail(), encoder.encode(signUpRequest.getPassword()));

        Set<Role> roles = new HashSet<>();
        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                .orElseThrow(() -> new AppException("Error: Role is not found. Initialize roles first."));
        roles.add(userRole);
        user.setRoles(roles);

        userRepository.save(user);
        return "User registered successfully!";
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtTokenProvider.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(userDetails.getId());

        return new JwtAuthenticationResponse(jwt, refreshToken.getToken(),
                userDetails.getId().toString(), userDetails.getEmail());
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse refreshToken(TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    String roles = user.getRoles().stream()
                            .map(role -> role.getName().name())
                            .collect(Collectors.joining(","));
                    String token = jwtTokenProvider.generateTokenFromUsername(user.getEmail(), user.getId().toString(), roles);

                    // Optionally, rotate refresh token
                    // RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user.getId());
                    // return new JwtAuthenticationResponse(token, newRefreshToken.getToken(), user.getId().toString(), user.getEmail());

                    // Or reuse existing refresh token if not rotating
                    return new JwtAuthenticationResponse(token, requestRefreshToken, user.getId().toString(), user.getEmail());
                })
                .orElseThrow(() -> new TokenRefreshException(requestRefreshToken, "Refresh token is not in database!"));
    }
}
