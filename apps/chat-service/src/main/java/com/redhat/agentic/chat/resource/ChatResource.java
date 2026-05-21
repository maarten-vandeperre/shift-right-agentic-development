package com.redhat.agentic.chat.resource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.redhat.agentic.chat.client.OpenAiClient;
import com.redhat.agentic.chat.client.OpenAiClient.ChatResult;
import com.redhat.agentic.chat.client.OpenAiClient.ToolCallInfo;
import com.redhat.agentic.chat.client.PeopleApiClient;
import com.redhat.agentic.chat.mcp.McpTools;
import com.redhat.agentic.chat.model.ChatRequest;
import com.redhat.agentic.chat.model.ChatResponse;
import com.redhat.agentic.chat.model.McpToolDefinition;
import com.redhat.agentic.chat.model.ToolCall;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/chat")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ChatResource {

    private static final Logger LOG = Logger.getLogger(ChatResource.class);
    private static final int MAX_TOOL_ROUNDS = 10;

    @Inject
    OpenAiClient openAiClient;

    @Inject
    McpTools mcpTools;

    @Inject
    ObjectMapper objectMapper;

    @RestClient
    PeopleApiClient peopleApiClient;

    @POST
    @Path("/ask")
    public Response ask(ChatRequest request) {
        try {
            return Response.ok(processChat(request)).build();
        } catch (Exception e) {
            LOG.errorf(e, "Error processing chat request");
            ChatResponse errorResponse = new ChatResponse(
                    "Error processing your request: " + e.getMessage(),
                    List.of()
            );
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse).build();
        }
    }

    @GET
    @Path("/mcp/tools")
    public List<McpToolDefinition> getMcpTools() {
        return mcpTools.getTools();
    }

    private ChatResponse processChat(ChatRequest request) throws Exception {
        List<ToolCall> executedToolCalls = new ArrayList<>();
        List<Map<String, Object>> tools = mcpTools.toOpenAiToolFormat();

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(openAiClient.buildSystemMessage(
                "You are a helpful assistant. You have access to tools that can search for people and retrieve their information including addresses. "
                        + "Use the available tools to answer the user's question. When you have found all needed information, provide a clear and concise answer."
        ));
        messages.add(openAiClient.buildUserMessage(request.getQuestion()));

        String orchestratorAnswer = null;

        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            ChatResult result = openAiClient.chatCompletion(
                    request.getOrchestratorUrl(),
                    request.getOrchestratorApiKey(),
                    request.getOrchestratorModel(),
                    messages,
                    tools
            );

            if (result.toolCalls().isEmpty()) {
                orchestratorAnswer = result.content();
                break;
            }

            messages.add(openAiClient.buildAssistantToolCallMessage(result.toolCalls()));

            for (ToolCallInfo tc : result.toolCalls()) {
                LOG.infof("Executing tool: %s with args: %s", tc.functionName(), tc.arguments());
                String toolResult = executeTool(tc.functionName(), tc.arguments());
                LOG.infof("Tool result for %s: %s", tc.functionName(), toolResult);

                executedToolCalls.add(new ToolCall(tc.functionName(), tc.arguments(), toolResult));
                messages.add(openAiClient.buildToolResultMessage(tc.id(), toolResult));
            }
        }

        if (orchestratorAnswer == null) {
            orchestratorAnswer = "Unable to get a final answer from the orchestrator after " + MAX_TOOL_ROUNDS + " rounds.";
        }

        String finalAnswer = orchestratorAnswer;
        if (request.getLocationUrl() != null && !request.getLocationUrl().isBlank()
                && request.getLocationModel() != null && !request.getLocationModel().isBlank()) {
            try {
                String locationAnswer = callLocationModel(request, orchestratorAnswer);
                if (locationAnswer != null && !locationAnswer.isBlank()) {
                    finalAnswer = orchestratorAnswer + "\n\n---\n\n**Touristic Information:**\n" + locationAnswer;
                }
            } catch (Exception e) {
                LOG.warnf(e, "Failed to get location information");
                finalAnswer = orchestratorAnswer + "\n\n(Could not retrieve touristic information: " + e.getMessage() + ")";
            }
        }

        return new ChatResponse(finalAnswer, executedToolCalls);
    }

    private String callLocationModel(ChatRequest request, String orchestratorAnswer) throws Exception {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(openAiClient.buildSystemMessage(
                "You are a travel guide expert. Given information about a person and their address, "
                        + "describe interesting touristic places, attractions, and things to do near their location. "
                        + "Be specific and enthusiastic about the recommendations."
        ));
        messages.add(openAiClient.buildUserMessage(
                "Based on the following information, describe touristic places and attractions near this person's location:\n\n"
                        + orchestratorAnswer
        ));

        ChatResult result = openAiClient.chatCompletion(
                request.getLocationUrl(),
                request.getLocationApiKey(),
                request.getLocationModel(),
                messages,
                null
        );

        return result.content();
    }

    private String executeTool(String toolName, String arguments) {
        try {
            JsonNode args = objectMapper.readTree(arguments);
            return switch (toolName) {
                case "search_people" -> executeSearchPeople(args);
                case "get_person" -> executeGetPerson(args);
                case "get_person_address" -> executeGetPersonAddress(args);
                default -> "{\"error\": \"Unknown tool: " + toolName + "\"}";
            };
        } catch (Exception e) {
            LOG.errorf(e, "Error executing tool %s", toolName);
            return "{\"error\": \"" + e.getMessage().replace("\"", "'") + "\"}";
        }
    }

    private String executeSearchPeople(JsonNode args) throws Exception {
        String firstName = args.has("firstName") ? args.get("firstName").asText() : null;
        String lastName = args.has("lastName") ? args.get("lastName").asText() : null;

        List<PeopleApiClient.PersonDto> allPeople = peopleApiClient.list();

        List<PeopleApiClient.PersonDto> filtered = allPeople.stream()
                .filter(p -> {
                    boolean matches = true;
                    if (firstName != null && !firstName.isBlank()) {
                        matches = p.firstName != null
                                && p.firstName.toLowerCase().contains(firstName.toLowerCase());
                    }
                    if (lastName != null && !lastName.isBlank()) {
                        matches = matches && p.lastName != null
                                && p.lastName.toLowerCase().contains(lastName.toLowerCase());
                    }
                    return matches;
                })
                .toList();

        return objectMapper.writeValueAsString(filtered);
    }

    private String executeGetPerson(JsonNode args) throws Exception {
        String ref = args.get("ref").asText();
        Response response = peopleApiClient.getByRef(ref);
        try {
            if (response.getStatus() == 200) {
                String body = response.readEntity(String.class);
                return body;
            } else {
                return "{\"error\": \"Person not found with ref: " + ref + "\"}";
            }
        } finally {
            response.close();
        }
    }

    private String executeGetPersonAddress(JsonNode args) throws Exception {
        String ref = args.get("ref").asText();
        Response response = peopleApiClient.getByRef(ref);
        try {
            if (response.getStatus() == 200) {
                String body = response.readEntity(String.class);
                JsonNode person = objectMapper.readTree(body);
                if (person.has("address") && !person.get("address").isNull()) {
                    return objectMapper.writeValueAsString(person.get("address"));
                } else {
                    return "{\"error\": \"No address found for person with ref: " + ref + "\"}";
                }
            } else {
                return "{\"error\": \"Person not found with ref: " + ref + "\"}";
            }
        } finally {
            response.close();
        }
    }
}
