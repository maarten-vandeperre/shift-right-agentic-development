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

create_app() {
  local app_name="$1"
  local app_path="$2"
  local dest_namespace="$3"

  echo "-------------------------------------------"
  echo "Creating Application: ${app_name}"
  echo "  Path:             ${app_path}"
  echo "  Dest Namespace:   ${dest_namespace}"

  oc apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${app_name}
  namespace: ${NAMESPACE}
spec:
  project: default
  source:
    repoURL: ${REPO_URL}
    targetRevision: ${TARGET_REVISION}
    path: ${app_path}
  destination:
    server: https://kubernetes.default.svc
    namespace: ${dest_namespace}
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
EOF

  echo "  Done."
  echo ""
}

check_argocd_ready
label_target_namespace

create_app "cluster-operators" "gitops/operators" "openshift-operators"
create_app "databases" "gitops/databases" "${NAMESPACE}"
create_app "applications" "gitops/apps" "${NAMESPACE}"
create_app "cdc" "gitops/cdc" "${NAMESPACE}"

echo "============================================"
echo "  ArgoCD Applications configured."
echo ""
echo "  'cluster-operators' manages:"
echo "    - Service Mesh 3 / Dev Spaces / AMQ Streams subscriptions"
echo ""
echo "  'databases' manages:"
echo "    - PostgreSQL + MongoDB deployments and seed data"
echo ""
echo "  'applications' manages:"
echo "    - person-service, address-service, people-service, cdc-service"
echo "    - frontend (React dashboard)"
echo ""
echo "  'cdc' manages:"
echo "    - Kafka cluster, KafkaConnect, Debezium connector"
echo "    - CDC topics, PostgreSQL WAL configuration"
echo ""
echo "  View in the ArgoCD UI:"
ROUTE=$(oc get route argocd-server -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null || echo "<argocd-route-not-found>")
echo "    https://${ROUTE}"
echo ""
echo "  Or via CLI:"
echo "    oc get applications -n ${NAMESPACE}"
echo "============================================"
