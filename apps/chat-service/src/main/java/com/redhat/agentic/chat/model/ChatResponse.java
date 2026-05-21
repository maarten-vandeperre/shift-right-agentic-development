package com.redhat.agentic.chat.model;

import java.util.ArrayList;
import java.util.List;

public class ChatResponse {

    private String answer;
    private List<ToolCall> toolCalls = new ArrayList<>();

    public ChatResponse() {
    }

    public ChatResponse(String answer, List<ToolCall> toolCalls) {
        this.answer = answer;
        this.toolCalls = toolCalls;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public List<ToolCall> getToolCalls() {
        return toolCalls;
    }

    public void setToolCalls(List<ToolCall> toolCalls) {
        this.toolCalls = toolCalls;
    }
}
