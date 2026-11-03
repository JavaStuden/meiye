package com.meiye.live.config;

import java.time.format.DateTimeParseException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.server.ResponseStatusException;

@ControllerAdvice
public class WebErrors {
    @ExceptionHandler(ResponseStatusException.class)
    @ResponseBody
    ResponseEntity<Map<String, String>> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("message", exception.getReason() == null ? "请求失败" : exception.getReason()));
    }
    @ExceptionHandler({BindException.class, IllegalArgumentException.class, DateTimeParseException.class})
    @ResponseBody
    ResponseEntity<Map<String, String>> invalid(Exception exception) {
        String message = exception instanceof BindException bind && bind.getBindingResult().getFieldError() != null
                ? bind.getBindingResult().getFieldError().getDefaultMessage() : "请检查输入内容与日期格式";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", message == null ? "参数不正确" : message));
    }
}
