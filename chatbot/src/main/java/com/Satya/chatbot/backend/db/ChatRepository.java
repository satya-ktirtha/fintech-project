package com.Satya.chatbot.backend.db;

import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ChatRepository extends CrudRepository<Chat, String> {

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO `chat` (`ID`, `from`, `to`, `message`, `timestamp`) VALUES (:id, :from, :to, :message, NOW())", nativeQuery = true)
    void addChat(@Param("id") String id,
                        @Param("from") String from,
                        @Param("to") String to,
                        @Param("message") String message);

    @Query(value = "SELECT * FROM `chat` WHERE `from`=:user OR `to`=:user", nativeQuery = true)
    List<Chat> getAllChat(@Param("user") String user);
}
