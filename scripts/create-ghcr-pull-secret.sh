#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${APP_NAMESPACE:-agentic}"
REGISTRY="${CONTAINER_REGISTRY:-ghcr.io}"
GITHUB_USER="${GITHUB_OWNER:-maarten-vandeperre}"

echo "============================================"
echo "  Create GHCR Image Pull Secret"
echo "  Namespace: ${NAMESPACE}"
echo "  Registry:  ${REGISTRY}"
echo "  User:      ${GITHUB_USER}"
echo "============================================"
echo ""

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "ERROR: GITHUB_TOKEN environment variable is not set."
  echo ""
  echo "Create a Personal Access Token at:"
  echo "  https://github.com/settings/tokens/new"
  echo ""
  echo "Required scope: read:packages"
  echo ""
  echo "Then run:"
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  echo "  ./scripts/create-ghcr-pull-secret.sh"
  exit 1
fi

if oc get secret ghcr-pull-secret -n "${NAMESPACE}" &>/dev/null; then
  echo "Secret 'ghcr-pull-secret' already exists. Replacing..."
  oc delete secret ghcr-pull-secret -n "${NAMESPACE}"
fi

echo "Creating image pull secret..."
oc create secret docker-registry ghcr-pull-secret \
  --docker-server="${REGISTRY}" \
  --docker-username="${GITHUB_USER}" \
  --docker-password="${GITHUB_TOKEN}" \
  -n "${NAMESPACE}"

echo "Linking secret to service accounts..."
oc secrets link default ghcr-pull-secret --for=pull -n "${NAMESPACE}"
for SA in $(oc get sa -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
  if [[ "${SA}" != "default" && "${SA}" != "builder" && "${SA}" != "deployer" ]]; then
    oc secrets link "${SA}" ghcr-pull-secret --for=pull -n "${NAMESPACE}" 2>/dev/null || true
  fi
done

echo ""
echo "Restarting application deployments..."
for APP in person-service address-service people-service cdc-service chat-service mesh-config-service frontend; do
  if oc get deploy "${APP}" -n "${NAMESPACE}" &>/dev/null; then
    oc rollout restart deploy/"${APP}" -n "${NAMESPACE}"
    echo "  Restarted: ${APP}"
  fi
done

echo ""
echo "============================================"
echo "  Done. Pods will re-pull images from GHCR."
echo "  Monitor with: oc get pods -n ${NAMESPACE} -w"
echo "============================================"
