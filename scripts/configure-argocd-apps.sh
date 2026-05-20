#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${ARGOCD_NAMESPACE:-agentic}"
REPO_URL="${GIT_REPO_URL:-https://github.com/maarten-vandeperre/shift-right-agentic-development.git}"
TARGET_REVISION="${GIT_REVISION:-main}"

echo "============================================"
echo "  Configuring ArgoCD Applications"
echo "  Namespace:  ${NAMESPACE}"
echo "  Repository: ${REPO_URL}"
echo "  Revision:   ${TARGET_REVISION}"
echo "============================================"
echo ""

check_argocd_ready() {
  echo "Checking ArgoCD readiness..."
  if ! oc get argocd argocd -n "${NAMESPACE}" &>/dev/null; then
    echo "ERROR: ArgoCD instance 'argocd' not found in namespace '${NAMESPACE}'."
    echo "       Deploy it first: oc apply -k gitops/argocd/ -n ${NAMESPACE}"
    exit 1
  fi

  local phase
  phase=$(oc get argocd argocd -n "${NAMESPACE}" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
  echo "ArgoCD status: ${phase}"

  if [[ "${phase}" != "Available" ]]; then
    echo "WARNING: ArgoCD is not yet in 'Available' phase. Applications may fail to sync until it is ready."
  fi
  echo ""
}

label_target_namespace() {
  echo "Labeling openshift-operators for ArgoCD management..."
  oc label namespace openshift-operators argocd.argoproj.io/managed-by="${NAMESPACE}" --overwrite
  echo ""
}

check_argocd_ready
label_target_namespace

echo "-------------------------------------------"
echo "Creating Application: cluster-operators"
echo "  Path:             gitops/operators"
echo "  Dest Namespace:   openshift-operators"

oc apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-operators
  namespace: ${NAMESPACE}
spec:
  project: default
  source:
    repoURL: ${REPO_URL}
    targetRevision: ${TARGET_REVISION}
    path: gitops/operators
  destination:
    server: https://kubernetes.default.svc
    namespace: openshift-operators
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
EOF

echo "  Done."
echo ""

echo "============================================"
echo "  ArgoCD Application configured."
echo ""
echo "  The 'cluster-operators' application manages:"
echo "    - Service Mesh 3 subscription"
echo "    - Dev Spaces subscription"
echo "    - AMQ Streams subscription"
echo ""
echo "  View in the ArgoCD UI:"
ROUTE=$(oc get route argocd-server -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null || echo "<argocd-route-not-found>")
echo "    https://${ROUTE}"
echo ""
echo "  Or via CLI:"
echo "    oc get applications -n ${NAMESPACE}"
echo "============================================"
