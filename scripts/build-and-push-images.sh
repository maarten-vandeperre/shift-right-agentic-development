#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${CONTAINER_REGISTRY:-ghcr.io}"
REPO_OWNER="${GITHUB_OWNER:-maarten-vandeperre}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
APPS_DIR="$(cd "$(dirname "$0")/../apps" && pwd)"
BUILDER="${CONTAINER_BUILDER:-podman}"
PLATFORM="${BUILD_PLATFORM:-linux/amd64}"

SERVICES=("person-service" "address-service" "people-service" "cdc-service" "chat-service" "mesh-config-service" "frontend")

echo "============================================"
echo "  Build & Push Container Images"
echo "  Registry: ${REGISTRY}/${REPO_OWNER}"
echo "  Tag:      ${IMAGE_TAG}"
echo "  Builder:  ${BUILDER}"
echo "  Platform: ${PLATFORM}"
echo "  Context:  ${APPS_DIR}"
echo "============================================"
echo ""

if ! ${BUILDER} version &>/dev/null; then
  echo "ERROR: '${BUILDER}' is not available."
  echo "       Install Docker/Podman or set CONTAINER_BUILDER=docker"
  exit 1
fi

echo "Authenticating to ${REGISTRY}..."
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "${GITHUB_TOKEN}" | ${BUILDER} login "${REGISTRY}" -u "${REPO_OWNER}" --password-stdin
else
  echo "WARNING: GITHUB_TOKEN not set. Assuming already authenticated."
  echo "         To authenticate: export GITHUB_TOKEN=<your-pat> and re-run."
fi
echo ""

echo "Pre-building frontend..."
(cd "${APPS_DIR}/frontend" && npm ci --silent && npm run build)
echo "Frontend build complete."
echo ""

for SERVICE in "${SERVICES[@]}"; do
  IMAGE="${REGISTRY}/${REPO_OWNER}/shift-right-${SERVICE}:${IMAGE_TAG}"
  echo "-------------------------------------------"
  echo "Building: ${SERVICE}"
  echo "Image:    ${IMAGE}"
  echo ""

  ${BUILDER} build \
    --platform "${PLATFORM}" \
    -t "${IMAGE}" \
    -f "${APPS_DIR}/${SERVICE}/Dockerfile" \
    "${APPS_DIR}"

  echo ""
  echo "Pushing: ${IMAGE}"
  ${BUILDER} push "${IMAGE}"

  echo "Done: ${SERVICE}"
  echo ""
done

echo "============================================"
echo "  All images built and pushed."
echo ""
for SERVICE in "${SERVICES[@]}"; do
  echo "  ${REGISTRY}/${REPO_OWNER}/shift-right-${SERVICE}:${IMAGE_TAG}"
done
echo "============================================"
