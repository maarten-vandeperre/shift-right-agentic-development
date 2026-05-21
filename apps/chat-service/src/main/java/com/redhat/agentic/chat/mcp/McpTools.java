package com.redhat.agentic.chat.mcp;

import java.util.List;
import java.util.Map;

import com.redhat.agentic.chat.model.McpToolDefinition;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class McpTools {

    private final List<McpToolDefinition> tools;

    public McpTools() {
        this.tools = List.of(
                new McpToolDefinition(
                        "search_people",
                        "Search people by first name and/or last name. Returns a list of matching people with their ref, firstName, lastName, and email.",
                        Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "firstName", Map.of(
                                                "type", "string",
                                                "description", "First name to search for (optional)"
                                        ),
                                        "lastName", Map.of(
                                                "type", "string",
                                                "description", "Last name to search for (optional)"
                                        )
                                ),
                                "required", List.of()
                        )
                ),
                new McpToolDefinition(
                        "get_person",
                        "Get a person by their unique reference ID. Returns the person's ref, firstName, lastName, email, and address.",
                        Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "ref", Map.of(
                                                "type", "string",
                                                "description", "The unique reference ID of the person"
                                        )
                                ),
                                "required", List.of("ref")
                        )
                ),
                new McpToolDefinition(
                        "get_person_address",
                        "Get the address for a person by their unique reference ID. Returns the address with line1, line2, and country fields.",
                        Map.of(
                                "type", "object",
                                "properties", Map.of(
                                        "ref", Map.of(
                                                "type", "string",
                                                "description", "The unique reference ID of the person"
                                        )
                                ),
                                "required", List.of("ref")
                        )
                )
        );
    }

    public List<McpToolDefinition> getTools() {
        return tools;
    }

    public List<Map<String, Object>> toOpenAiToolFormat() {
        return tools.stream()
                .map(tool -> Map.<String, Object>of(
                        "type", "function",
                        "function", Map.of(
                                "name", tool.getName(),
                                "description", tool.getDescription(),
                                "parameters", tool.getParameters()
                        )
                ))
                .toList();
    }
}
