package com.example.backend.service;

import com.example.backend.dto.BoardDto;
import com.example.backend.dto.CreateBoardRequest;
import com.example.backend.dto.UpdateBoardRequest;

import java.util.List;
import java.util.UUID;

public interface BoardService {
    BoardDto createBoard(CreateBoardRequest createBoardRequest, UUID ownerId);
    BoardDto getBoardById(UUID boardId, UUID ownerId);
    List<BoardDto> getAllBoardsByOwner(UUID ownerId);
    BoardDto updateBoard(UUID boardId, UpdateBoardRequest updateBoardRequest, UUID ownerId);
    void deleteBoard(UUID boardId, UUID ownerId);
}