package com.meiye.live.room;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

@RestController
public class MiniProgramCommentApi {
    private final InteractionService interactions;
    public MiniProgramCommentApi(InteractionService interactions) { this.interactions = interactions; }

    @PostMapping({"/api/miniprogram/rooms/{id}/messages", "/meiye/api/miniprogram/rooms/{id}/messages"})
    @ResponseStatus(HttpStatus.CREATED)
    public InteractionService.MessageView post(@PathVariable long id,
            @RequestHeader("X-Viewer-Token") String viewerToken,
            @Valid @RequestBody InteractionService.MessageRequest message, HttpServletRequest request) {
        if (!viewerToken.matches("[A-Za-z0-9_-]{16,80}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "访客标识无效");
        return interactions.postFromMiniProgram(id, viewerToken, request.getRemoteAddr(), message);
    }
}
