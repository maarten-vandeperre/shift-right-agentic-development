#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${CONTAINER_REGISTRY:-ghcr.io}"
REPO_OWNER="${GITHUB_OWNER:-maarten-vandeperre}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
APPS_DIR="$(cd "$(dirname "$0")/../apps" && pwd)"
BUILDER="${CONTAINER_BUILDER:-docker}"

SERVICES=("person-service" "address-service" "people-service" "frontend")

echo "============================================"
echo "  Build & Push Container Images"
echo "  Registry: ${REGISTRY}/${REPO_OWNER}"
echo "  Tag:      ${IMAGE_TAG}"
echo "  Builder:  ${BUILDER}"
echo "============================================"
echo ""

if ! ${BUILDER} info &>/dev/null; then
  echo "ERROR: '${BUILDER}' is not running or not installed."
  echo "       Install Docker/Podman or set CONTAINER_BUILDER=podman"
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

for SERVICE in "${SERVICES[@]}"; do
  IMAGE="${REGISTRY}/${REPO_OWNER}/shift-right-${SERVICE}:${IMAGE_TAG}"
  echo "-------------------------------------------"
  echo "Building: ${SERVICE}"
  echo "Image:    ${IMAGE}"
  echo ""

  ${BUILDER} build \
    -t "${IMAGE}" \
    -f "${APPS_DIR}/${SERVICE}/Dockerfile" \
    "${APPS_DIR}/${SERVICE}"

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
