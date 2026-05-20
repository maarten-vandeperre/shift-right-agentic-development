#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${APP_NAMESPACE:-agentic}"

echo "============================================"
echo "  Application URLs"
echo "  Namespace: ${NAMESPACE}"
echo "============================================"
echo ""

APPS=("frontend" "person-service" "address-service" "people-service")

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
    fi
  else
    echo "  ${APP}: route not found"
  fi
  echo ""
done

echo "============================================"
