#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${APP_NAMESPACE:-agentic}"

echo "============================================"
echo "  Application URLs"
echo "  Namespace: ${NAMESPACE}"
echo "============================================"
echo ""

APPS=("frontend" "person-service" "address-service" "people-service" "cdc-service" "chat-service" "mesh-config-service")

for APP in "${APPS[@]}"; do
  HOST=$(oc get route "${APP}" -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null) || HOST=""
  if [[ -n "${HOST}" ]]; then
    echo "  ${APP}:"
    echo "    https://${HOST}"
    if [[ "${APP}" == "person-service" ]]; then
      echo "    API:     https://${HOST}/api/persons"
      echo "    OpenAPI: https://${HOST}/q/openapi"
    elif [[ "${APP}" == "address-service" ]]; then
      echo "    API:     https://${HOST}/api/addresses"
      echo "    OpenAPI: https://${HOST}/q/openapi"
    elif [[ "${APP}" == "people-service" ]]; then
      echo "    API:     https://${HOST}/api/people"
      echo "    OpenAPI: https://${HOST}/q/openapi"
    elif [[ "${APP}" == "cdc-service" ]]; then
      echo "    SSE:     https://${HOST}/api/cdc/events"
      echo "    OpenAPI: https://${HOST}/q/openapi"
    elif [[ "${APP}" == "chat-service" ]]; then
      echo "    Chat:    https://${HOST}/api/chat/ask"
      echo "    MCP:     https://${HOST}/api/chat/mcp/tools"
      echo "    OpenAPI: https://${HOST}/q/openapi"
    elif [[ "${APP}" == "mesh-config-service" ]]; then
      echo "    API:     https://${HOST}/api/mesh"
      echo "    OpenAPI: https://${HOST}/q/openapi"
    fi
  else
    echo "  ${APP}: route not found"
  fi
  echo ""
done

echo "============================================"
