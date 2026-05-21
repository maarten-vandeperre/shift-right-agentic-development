#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${APP_NAMESPACE:-agentic}"
DURATION="${DURATION:-300}"
RPS="${RPS:-5}"
INTERVAL=$(echo "scale=3; 1/$RPS" | bc)

PERSON_URL=$(oc get route person-service -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)
ADDRESS_URL=$(oc get route address-service -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)
PEOPLE_URL=$(oc get route people-service -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)
CDC_URL=$(oc get route cdc-service -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)
FRONTEND_URL=$(oc get route frontend -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)

echo "============================================"
echo "  Traffic Generator"
echo "  Duration: ${DURATION}s | Target: ~${RPS} req/s"
echo "============================================"
echo ""
echo "  Endpoints:"
echo "    person-service:  https://${PERSON_URL}"
echo "    address-service: https://${ADDRESS_URL}"
echo "    people-service:  https://${PEOPLE_URL}"
echo "    cdc-service:     https://${CDC_URL}"
echo "    frontend:        https://${FRONTEND_URL}"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

TOTAL=0
ERRORS=0
START=$(date +%s)

while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START))
  if [[ ${ELAPSED} -ge ${DURATION} ]]; then
    break
  fi

  # Hit all services in parallel
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${PERSON_URL}/api/persons" 2>/dev/null) && TOTAL=$((TOTAL+1)) || true
  [[ "$CODE" != "200" ]] && ERRORS=$((ERRORS+1))

  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${ADDRESS_URL}/api/addresses" 2>/dev/null) && TOTAL=$((TOTAL+1)) || true
  [[ "$CODE" != "200" ]] && ERRORS=$((ERRORS+1))

  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${PEOPLE_URL}/api/people" 2>/dev/null) && TOTAL=$((TOTAL+1)) || true
  [[ "$CODE" != "200" ]] && ERRORS=$((ERRORS+1))

  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${CDC_URL}/api/cdc/history" 2>/dev/null) && TOTAL=$((TOTAL+1)) || true
  [[ "$CODE" != "200" ]] && ERRORS=$((ERRORS+1))

  CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${FRONTEND_URL}/" 2>/dev/null) && TOTAL=$((TOTAL+1)) || true
  [[ "$CODE" != "200" ]] && ERRORS=$((ERRORS+1))

  printf "\r  [%ds/%ds] requests: %d | errors: %d" "${ELAPSED}" "${DURATION}" "${TOTAL}" "${ERRORS}"

  sleep "${INTERVAL}" 2>/dev/null || sleep 1
done

echo ""
echo ""
echo "============================================"
echo "  Done. Total: ${TOTAL} requests, ${ERRORS} errors"
echo "  Open Kiali to see the traffic graph."
echo "============================================"
