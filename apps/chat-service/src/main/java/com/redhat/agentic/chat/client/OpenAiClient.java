package com.redhat.agentic.chat.client;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.jboss.logging.Logger;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class OpenAiClient {

    private static final Logger LOG = Logger.getLogger(OpenAiClient.class);

    @Inject
    ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    public record ChatResult(String content, List<ToolCallInfo> toolCalls) {
    }

    public record ToolCallInfo(String id, String functionName, String arguments) {
    }

    public ChatResult chatCompletion(String baseUrl, String apiKey, String model,
            List<Map<String, Object>> messages, List<Map<String, Object>> tools) throws Exception {

        String url = baseUrl.endsWith("/")
                ? baseUrl + "chat/completions"
                : baseUrl + "/chat/completions";

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.set("messages", objectMapper.valueToTree(messages));
        if (tools != null && !tools.isEmpty()) {
            body.set("tools", objectMapper.valueToTree(tools));
        }

        String requestBody = objectMapper.writeValueAsString(body);
        LOG.debugf("OpenAI request to %s: %s", url, requestBody);

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(120))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody));

        if (apiKey != null && !apiKey.isBlank()) {
            requestBuilder.header("Authorization", "Bearer " + apiKey);
        }

        HttpResponse<String> response = httpClient.send(requestBuilder.build(),
                HttpResponse.BodyHandlers.ofString());

        LOG.debugf("OpenAI response status: %d, body: %s", response.statusCode(), response.body());

        if (response.statusCode() != 200) {
            throw new RuntimeException("OpenAI API returned status " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode choices = root.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("No choices in OpenAI response");
        }

        JsonNode message = choices.get(0).get("message");
        String content = message.has("content") && !message.get("content").isNull()
                ? message.get("content").asText()
                : null;

        List<ToolCallInfo> toolCallInfos = new ArrayList<>();
        if (message.has("tool_calls") && !message.get("tool_calls").isNull()) {
            for (JsonNode tc : message.get("tool_calls")) {
                String id = tc.get("id").asText();
                String functionName = tc.get("function").get("name").asText();
                String arguments = tc.get("function").get("arguments").asText();
                toolCallInfos.add(new ToolCallInfo(id, functionName, arguments));
            }
        }

        return new ChatResult(content, toolCallInfos);
    }

    public Map<String, Object> buildAssistantToolCallMessage(List<ToolCallInfo> toolCalls) {
        List<Map<String, Object>> tcList = new ArrayList<>();
        for (ToolCallInfo tc : toolCalls) {
            tcList.add(Map.of(
                    "id", tc.id(),
                    "type", "function",
                    "function", Map.of(
                            "name", tc.functionName(),
                            "arguments", tc.arguments()
                    )
            ));
        }

        ObjectNode node = objectMapper.createObjectNode();
        node.put("role", "assistant");
        node.putNull("content");
        node.set("tool_calls", objectMapper.valueToTree(tcList));

        @SuppressWarnings("unchecked")
        Map<String, Object> result = objectMapper.convertValue(node, Map.class);
        return result;
    }

    public Map<String, Object> buildToolResultMessage(String toolCallId, String result) {
        return Map.of(
                "role", "tool",
                "tool_call_id", toolCallId,
                "content", result
        );
    }

    public Map<String, Object> buildUserMessage(String content) {
        return Map.of("role", "user", "content", content);
    }

    public Map<String, Object> buildSystemMessage(String content) {
        return Map.of("role", "system", "content", content);
    }
}
