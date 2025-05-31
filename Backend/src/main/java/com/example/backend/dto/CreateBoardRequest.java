package com.example.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateBoardRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String jsonData;
}
