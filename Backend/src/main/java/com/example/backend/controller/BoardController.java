package com.example.backend.controller;

import com.example.backend.dto.BoardDto;
import com.example.backend.dto.CreateBoardRequest;
import com.example.backend.dto.MessageResponse;
import com.example.backend.dto.UpdateBoardRequest;
import com.example.backend.security.UserDetailsImpl;
import com.example.backend.service.BoardService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/boards")
public class BoardController {

    @Autowired
    private BoardService boardService;

    @PostMapping
    public ResponseEntity<BoardDto> createBoard(@Valid @RequestBody CreateBoardRequest createBoardRequest,
                                                @AuthenticationPrincipal UserDetailsImpl currentUser) {
        BoardDto createdBoard = boardService.createBoard(createBoardRequest, currentUser.getId());
        return new ResponseEntity<>(createdBoard, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BoardDto> getBoardById(@PathVariable UUID id,
                                                 @AuthenticationPrincipal UserDetailsImpl currentUser) {
        BoardDto boardDto = boardService.getBoardById(id, currentUser.getId());
        return ResponseEntity.ok(boardDto);
    }

    @GetMapping
    public ResponseEntity<List<BoardDto>> getAllBoardsForUser(@AuthenticationPrincipal UserDetailsImpl currentUser) {
        List<BoardDto> boards = boardService.getAllBoardsByOwner(currentUser.getId());
        return ResponseEntity.ok(boards);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BoardDto> updateBoard(@PathVariable UUID id,
                                                @Valid @RequestBody UpdateBoardRequest updateBoardRequest,
                                                @AuthenticationPrincipal UserDetailsImpl currentUser) {
        BoardDto updatedBoard = boardService.updateBoard(id, updateBoardRequest, currentUser.getId());
        return ResponseEntity.ok(updatedBoard);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteBoard(@PathVariable UUID id,
                                                       @AuthenticationPrincipal UserDetailsImpl currentUser) {
        boardService.deleteBoard(id, currentUser.getId());
        return ResponseEntity.ok(new MessageResponse("Board deleted successfully."));
    }
}
