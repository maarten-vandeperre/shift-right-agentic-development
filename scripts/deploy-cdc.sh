#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${ARGOCD_NAMESPACE:-agentic}"

echo "============================================"
echo "  Deploy CDC Pipeline"
echo "  Namespace: ${NAMESPACE}"
echo "============================================"
echo ""

# Step 1: Configure ArgoCD applications (includes the 'cdc' app)
echo "[1/5] Configuring ArgoCD applications..."
./scripts/configure-argocd-apps.sh
echo ""

# Step 2: Wait for Kafka cluster to be ready
echo "[2/5] Waiting for Kafka cluster to be ready..."
echo "  This may take several minutes on first deploy..."
for i in $(seq 1 60); do
  STATUS=$(oc get kafka cdc-cluster -n "${NAMESPACE}" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo "")
  if [[ "${STATUS}" == "True" ]]; then
    echo "  Kafka cluster is ready."
    break
  fi
  if [[ $i -eq 60 ]]; then
    echo "  WARNING: Kafka cluster not ready after 10 minutes. Continuing anyway."
    echo "  Check: oc describe kafka cdc-cluster -n ${NAMESPACE}"
  fi
  printf "  Attempt %d/60 - status: %s\r" "$i" "${STATUS:-pending}"
  sleep 10
done
echo ""

# Step 3: Restart PostgreSQL to apply WAL level = logical
echo "[3/5] Restarting PostgreSQL to apply wal_level=logical..."
oc rollout restart deploy/postgresql -n "${NAMESPACE}"
oc rollout status deploy/postgresql -n "${NAMESPACE}" --timeout=120s

echo "  Verifying WAL level..."
sleep 10
WAL=$(oc exec deploy/postgresql -n "${NAMESPACE}" -- psql -U agentic -d agentic -t -A -c "SHOW wal_level;" 2>/dev/null || echo "unknown")
echo "  wal_level = ${WAL}"
if [[ "${WAL}" != *"logical"* ]]; then
  echo "  WARNING: wal_level is not 'logical'. The WAL config job may not have run yet."
  echo "  Run: oc delete job postgresql-enable-wal -n ${NAMESPACE}"
  echo "  Then: oc annotate application cdc -n ${NAMESPACE} argocd.argoproj.io/refresh=hard --overwrite"
  echo "  Then re-run this script."
fi
echo ""

# Step 4: Build and push container images
echo "[4/5] Building and pushing container images..."
./scripts/build-and-push-images.sh
echo ""

# Step 5: Restart application deployments to pick up new images
echo "[5/5] Restarting application deployments..."
oc rollout restart deploy/cdc-service deploy/frontend -n "${NAMESPACE}"
oc rollout status deploy/cdc-service -n "${NAMESPACE}" --timeout=120s
oc rollout status deploy/frontend -n "${NAMESPACE}" --timeout=120s
echo ""

# Final status
echo "============================================"
echo "  CDC Pipeline Deployment Complete"
echo ""
echo "  Kafka:     $(oc get kafka cdc-cluster -n "${NAMESPACE}" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo 'pending')"
echo "  Connect:   $(oc get kafkaconnect cdc-connect -n "${NAMESPACE}" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null || echo 'pending')"
echo "  Connector: $(oc get kafkaconnector debezium-postgres -n "${NAMESPACE}" -o jsonpath='{.status.connectorStatus.connector.state}' 2>/dev/null || echo 'pending')"
echo "  cdc-svc:   $(oc get deploy cdc-service -n "${NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo '0')/1 ready"
echo ""
echo "  Frontend:  https://$(oc get route frontend -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)"
echo "  CDC SSE:   https://$(oc get route cdc-service -n "${NAMESPACE}" -o jsonpath='{.spec.host}' 2>/dev/null)/api/cdc/events"
echo "============================================"
