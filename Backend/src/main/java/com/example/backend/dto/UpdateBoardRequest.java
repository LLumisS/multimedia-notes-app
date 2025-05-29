package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateBoardRequest {
    @NotBlank
    private String jsonData;
}
