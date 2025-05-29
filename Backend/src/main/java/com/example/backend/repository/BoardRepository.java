package com.example.backend.repository;

import com.example.backend.entity.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BoardRepository extends JpaRepository<Board, UUID> {
    List<Board> findByOwnerId(UUID ownerId);
    Optional<Board> findByIdAndOwnerId(UUID id, UUID ownerId);
}
