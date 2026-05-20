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

cleanup_old_apps() {
  local old_apps=("operator-service-mesh-3" "operator-devspaces" "operator-amq-streams")
  for app in "${old_apps[@]}"; do
    if oc get application "${app}" -n "${NAMESPACE}" &>/dev/null; then
      echo "Removing legacy Application: ${app}"
      oc delete application "${app}" -n "${NAMESPACE}" --wait=false
    fi
  done
}

check_argocd_ready

cleanup_old_apps

echo "-------------------------------------------"
echo "Creating Application: cluster-operators"
echo "  Path:             gitops/operators"
echo "  Dest Namespace:   ${NAMESPACE}"

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
    namespace: ${NAMESPACE}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
EOF

echo "  Done."
echo ""

echo "============================================"
echo "  ArgoCD Application configured."
echo ""
echo "  The 'cluster-operators' application manages:"
echo "    - OperatorGroup (AllNamespaces mode)"
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
