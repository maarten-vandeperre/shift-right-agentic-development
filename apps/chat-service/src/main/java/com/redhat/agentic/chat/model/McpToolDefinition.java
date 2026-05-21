package com.redhat.agentic.chat.model;

import java.util.Map;

public class McpToolDefinition {

    private String name;
    private String description;
    private Map<String, Object> parameters;

    public McpToolDefinition() {
    }

    public McpToolDefinition(String name, String description, Map<String, Object> parameters) {
        this.name = name;
        this.description = description;
        this.parameters = parameters;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Map<String, Object> getParameters() {
        return parameters;
    }

    public void setParameters(Map<String, Object> parameters) {
        this.parameters = parameters;
    }
}
