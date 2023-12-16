package com.Satya.chatbot.backend;

import com.Satya.chatbot.backend.db.Chat;
import com.Satya.chatbot.backend.db.ChatRepository;
import com.Satya.chatbot.backend.db.Keys;
import com.Satya.chatbot.backend.db.KeysRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.util.DigestUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class API {

    @Autowired
    private KeysRepository keyRepo;
    @Autowired
    private ChatRepository chatRepo;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private WebClient webClient;

    private final HashMap<String, String> session = new HashMap<>();

    @MessageMapping("/client-connect")
    @SendToUser("/client/connect")
    public String connect(@RequestBody String body, @Headers Map<String, Object> headers) {
        System.out.println("Client connecting");
        session.put(body, headers.get("simpSessionId").toString());

        return headers.get("simpSessionId").toString();
    }

    @MessageMapping("/connect")
    @SendToUser("/server/connect")
    public Status serverConnect(@RequestBody String body, @Headers Map<String, Object> headers) {
        System.out.println("Server connecting");

        Keys key = keyRepo.getPairs(DigestUtils.md5DigestAsHex(body.getBytes()));

        if(key != null)
            session.put(key.getName(), headers.get("simpSessionId").toString());
        else
            return new Status(Status.Type.FAILED, "Unregistered account");

        return new Status(Status.Type.SUCCESS, headers.get("simpSessionId").toString());
    }

    @CrossOrigin("http://localhost:5173")
    @GetMapping("/client-getMessage")
    public Status getMessage(@RequestParam(value="user") String user) {
        List<Chat> chats = chatRepo.getAllChat(user);

        return new Status(Status.Type.SUCCESS, chats.toString());
    }

    @CrossOrigin("http://localhost:5173")
    @PostMapping("/client-sendMessage")
    public Status clientSend(@RequestBody Message m) {
        System.out.printf("Client %s sent to %s message: %s%n", m.getFrom(), m.getTo(), m.getMessage());

        String forHashing = m.getFrom().concat(m.getTo()).concat(m.getMessage().toString()).concat(new Date().toString());

        chatRepo.addChat(new String(DigestUtils.md5Digest(forHashing.getBytes())), m.getFrom(), m.getTo(), m.getMessage().toString());
        // TODO error checking
        // TODO ID is gibberish (although still hashed)

        System.out.println("Updated message, notifying /server/notify/" + session.get(m.getTo()));
        messagingTemplate.convertAndSend("/server/notify/" + session.get(m.getTo()), m);

        return Status.SUCCESS;
    }

    @CrossOrigin("http://localhost:3000")
    @PostMapping("/sendMessage")
    public Status serverRespond(@RequestBody ServerMessage m) {
        Keys key = keyRepo.getPairs(DigestUtils.md5DigestAsHex(m.getApiKey().getBytes()));

        System.out.printf("Client %s sent to %s message: %s%n", key.getName(), m.getTo(), m.getMessage());

        if(key == null)
            return new Status(Status.Type.FAILED, "Unregistered");

        String forHashing = m.getApiKey().concat(m.getTo()).concat(m.getMessage()).concat(new Date().toString());


        chatRepo.addChat(new String(DigestUtils.md5Digest(forHashing.getBytes())), key.getName(), m.getTo(), m.getMessage());
        // TODO error checking
        // TODO ID is gibberish (although still hashed)

        System.out.println("Updated message, notifying /server/notify/" + session.get(m.getTo()));
        messagingTemplate.convertAndSend("/client/notify/" + session.get(m.getTo()),
                    new Message(m.getType(), key.getName(), m.getTo(), m.getMessage()));

        return Status.SUCCESS;
    }
}

class Status {

    enum Type {

        SUCCESS(0),
        FAILED(-1);

        private final int status;

        private Type(int type) {
            status = type;
        }

        public int getStatus() {
            return status;
        }
    }

    public static final Status SUCCESS = new Status(Type.SUCCESS, "Success");
    public static final Status FAILED = new Status(Type.SUCCESS, "Failed");

    public Status(Type type, String message) {
        this.type = type;
        this.message = message;
    }

    private final Type type;
    private String message;

    public Type getType() {
        return type;
    }
    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}

class Message {

    enum Type {
        MESSAGE,
        LIST,
        IMAGE,
        FILE
    }

    private String type;
    private String from;
    private String to;
    private Object message;

    public Message(String type, String from, String to, Object message) {
        this.type = type;
        this.from = from;
        this.to = to;
        this.message = message;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public Object getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String toString() {
        return this.type;
    }
}

class ServerMessage {
    private String apiKey;
    private String type;
    private String to;
    private String message;

    public ServerMessage(String apiKey, String type, String to, String message) {
        this.apiKey = apiKey;
        this.type = type;
        this.to = to;
        this.message = message;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}