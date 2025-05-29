package com.example.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class BoardDto {
    private UUID id;
    private String name;
    private String jsonData;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UUID ownerId;
}
