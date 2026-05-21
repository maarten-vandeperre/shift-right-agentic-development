# Chatter Time & MCP Guide

This guide documents the AI-powered chat feature that uses MCP (Model Context Protocol)
tool calling to answer questions about people and their locations.

## Architecture

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Frontend │────>│ chat-service │────>│ Orchestrator LLM│     │ Location LLM │
│ Chatter  │     │ (Quarkus)    │     │ (tool calling)  │     │ (describes   │
│ Time tab │     │              │     └────────┬────────┘     │  places)     │
└──────────┘     │              │              │ tool calls   └──────────────┘
                 │              │<─────────────┘                     ▲
                 │              │                                     │
                 │              │──── execute tools ──>┌──────────┐   │
                 │              │                      │ people-  │   │
                 │              │<── tool results ─────│ service  │   │
                 │              │                      │ (MongoDB)│   │
                 │              │──── describe location ──────────────┘
                 └──────────────┘                      └──────────┘
```

### Flow

1. User types a question like "Where does John Doe live?"
2. The **chat-service** sends the question to the **Orchestrator LLM** along with
   MCP tool definitions (search_people, get_person, get_person_address)
3. The Orchestrator LLM decides to call tools — e.g., `search_people(firstName="John", lastName="Doe")`
4. The chat-service executes the tool by calling the **people-service** REST API
5. The tool result is sent back to the Orchestrator LLM
6. The LLM may call more tools (e.g., `get_person_address`) to get the full address
7. Once the address is known, the chat-service calls the **Location LLM** asking it
   to describe touristic places near that address
8. The combined answer is returned to the frontend

## MCP Tool Definitions

The chat-service exposes MCP-style tool definitions that the Orchestrator LLM can call:

### `search_people`
Search for people by first name and/or last name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| firstName | string | no | First name to search for |
| lastName | string | no | Last name to search for |

### `get_person`
Get a specific person by their reference ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ref | string | yes | The person's unique reference ID |

### `get_person_address`
Get the address for a specific person.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ref | string | yes | The person's unique reference ID |

## Configuration

### LLM Model Configuration

The chat feature requires two OpenAI-compatible LLM endpoints, configured in the
frontend UI and stored in the browser's localStorage:

1. **Orchestrator Model** — Must support function/tool calling
   - URL: The base URL of the OpenAI-compatible API (e.g., `https://api.openai.com/v1`)
   - API Key: Optional, depending on the provider
   - Model: The model identifier (e.g., `gpt-4`, `gpt-3.5-turbo`)

2. **Location Model** — Any text generation model
   - URL: Can be the same or different provider
   - API Key: Optional
   - Model: The model identifier

### Supported LLM Providers

Any OpenAI-compatible API works:
- OpenAI (`https://api.openai.com/v1`)
- Azure OpenAI
- Ollama (`http://localhost:11434/v1`)
- vLLM, LocalAI, LM Studio, etc.

## Frontend Tabs

### Chatter Time
The chat interface with:
- Collapsible configuration panel for both LLM endpoints
- Chat message history with user/assistant message bubbles
- Tool call details shown in collapsible sections within assistant messages

### MCP
Displays the MCP tool definitions available to the Orchestrator LLM:
- Tool name and description
- Parameter schema with types and requirements

### OpenAPI
Shows the OpenAPI specifications for all microservices:
- person-service, address-service, people-service
- cdc-service, chat-service

## Deployment

The chat-service is deployed via the existing GitOps pipeline:

```bash
./scripts/build-and-push-images.sh
```

This builds and pushes `ghcr.io/maarten-vandeperre/shift-right-chat-service:latest`.

The service is included in the `applications` ArgoCD Application via `gitops/apps/chat-service/`.

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat/ask` | Send a question, receive an AI answer |
| `GET /api/chat/mcp/tools` | List available MCP tool definitions |
| `GET /q/openapi` | OpenAPI specification |
| `GET /q/health/ready` | Readiness probe |

## Troubleshooting

### Chat returns "Failed to call orchestrator model"
- Verify the Orchestrator URL is correct and accessible
- Check the API key is valid
- Ensure the model name is correct for the provider

### Tools not being called
- Verify the people-service is running: `oc get pods -n agentic -l app=people-service`
- Check the chat-service logs: `oc logs deploy/chat-service -n agentic`
- Ensure the orchestrator model supports function/tool calling

### Location description not appearing
- Verify the Location LLM URL and model are configured
- The Location LLM doesn't need tool calling support — any chat model works
