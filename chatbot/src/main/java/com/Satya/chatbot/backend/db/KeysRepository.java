package com.Satya.chatbot.backend.db;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

public interface KeysRepository extends CrudRepository<Keys, String> {

    @Query(value = "SELECT * FROM `keys` WHERE `key`=:k LIMIT 1", nativeQuery = true)
    Keys getPairs(@Param("k") String apiKey);
}
