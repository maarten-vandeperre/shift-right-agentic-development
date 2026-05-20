#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${ARGOCD_NAMESPACE:-agentic}"
ARGOCD_NAME="${ARGOCD_INSTANCE:-argocd}"

echo "============================================"
echo "  ArgoCD Credentials for '${ARGOCD_NAME}'"
echo "  Namespace: ${NAMESPACE}"
echo "============================================"
echo ""

ROUTE=$(oc get route "${ARGOCD_NAME}-server" -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null) || {
  echo "ERROR: Could not find ArgoCD server route '${ARGOCD_NAME}-server' in namespace '${NAMESPACE}'."
  echo "       Make sure the ArgoCD instance is deployed and the route is created."
  echo ""
  echo "To deploy ArgoCD, run:"
  echo "  oc apply -k gitops/argocd/ -n ${NAMESPACE}"
  exit 1
}

SECRET_NAME="${ARGOCD_NAME}-cluster"
ADMIN_PASSWORD=$(oc get secret "${SECRET_NAME}" -n "${NAMESPACE}" -o jsonpath='{.data.admin\.password}' 2>/dev/null | base64 -d) || {
  echo "ERROR: Could not retrieve admin password from secret '${SECRET_NAME}' in namespace '${NAMESPACE}'."
  exit 1
}

echo "  URL:      https://${ROUTE}"
echo "  Username: admin"
echo "  Password: ${ADMIN_PASSWORD}"
echo ""
echo "============================================"
