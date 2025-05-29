package com.example.backend.service;

import com.example.backend.dto.BoardDto;
import com.example.backend.dto.CreateBoardRequest;
import com.example.backend.dto.UpdateBoardRequest;
import com.example.backend.entity.Board;
import com.example.backend.entity.User;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.BoardRepository;
import com.example.backend.repository.UserRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BoardServiceImpl implements BoardService {

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Override
    @Transactional
    public BoardDto createBoard(CreateBoardRequest createBoardRequest, UUID ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", ownerId));
        Board board = new Board(createBoardRequest.getName(), createBoardRequest.getJsonData(), owner);
        Board savedBoard = boardRepository.save(board);
        return modelMapper.map(savedBoard, BoardDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public BoardDto getBoardById(UUID boardId, UUID ownerId) {
        Board board = boardRepository.findByIdAndOwnerId(boardId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", "id", boardId + " for owner " + ownerId));
        return modelMapper.map(board, BoardDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BoardDto> getAllBoardsByOwner(UUID ownerId) {
        List<Board> boards = boardRepository.findByOwnerId(ownerId);
        return boards.stream()
                .map(board -> modelMapper.map(board, BoardDto.class))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BoardDto updateBoard(UUID boardId, UpdateBoardRequest updateBoardRequest, UUID ownerId) {
        Board board = boardRepository.findByIdAndOwnerId(boardId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", "id", boardId + " for owner " + ownerId));
        board.setName(updateBoardRequest.getName());
        board.setJsonData(updateBoardRequest.getJsonData());
        Board updatedBoard = boardRepository.save(board);
        return modelMapper.map(updatedBoard, BoardDto.class);
    }

    @Override
    @Transactional
    public void deleteBoard(UUID boardId, UUID ownerId) {
        Board board = boardRepository.findByIdAndOwnerId(boardId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Board", "id", boardId + " for owner " + ownerId));
        boardRepository.delete(board);
    }
}
