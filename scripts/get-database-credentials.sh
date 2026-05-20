#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${DB_NAMESPACE:-agentic}"

echo "============================================"
echo "  Database Credentials"
echo "  Namespace: ${NAMESPACE}"
echo "============================================"

# --- PostgreSQL ---
echo ""
echo "  PostgreSQL"
echo "  ----------"

PG_USER=$(oc get secret postgresql-credentials -n "${NAMESPACE}" -o jsonpath='{.data.POSTGRESQL_USER}' 2>/dev/null | base64 -d) || {
  echo "  ERROR: Could not read secret 'postgresql-credentials' in namespace '${NAMESPACE}'."
  PG_USER=""
}

if [[ -n "${PG_USER}" ]]; then
  PG_PASS=$(oc get secret postgresql-credentials -n "${NAMESPACE}" -o jsonpath='{.data.POSTGRESQL_PASSWORD}' | base64 -d)
  PG_DB=$(oc get secret postgresql-credentials -n "${NAMESPACE}" -o jsonpath='{.data.POSTGRESQL_DATABASE}' | base64 -d)
  PG_HOST="postgresql.${NAMESPACE}.svc.cluster.local"
  PG_PORT="5432"

  echo "  Host:     ${PG_HOST}"
  echo "  Port:     ${PG_PORT}"
  echo "  Database: ${PG_DB}"
  echo "  Username: ${PG_USER}"
  echo "  Password: ${PG_PASS}"
  echo ""
  echo "  JDBC URL: jdbc:postgresql://${PG_HOST}:${PG_PORT}/${PG_DB}"
  echo "  URI:      postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"
fi

# --- MongoDB ---
echo ""
echo "  MongoDB"
echo "  -------"

MONGO_USER=$(oc get secret mongodb-credentials -n "${NAMESPACE}" -o jsonpath='{.data.MONGODB_USER}' 2>/dev/null | base64 -d) || {
  echo "  ERROR: Could not read secret 'mongodb-credentials' in namespace '${NAMESPACE}'."
  MONGO_USER=""
}

if [[ -n "${MONGO_USER}" ]]; then
  MONGO_PASS=$(oc get secret mongodb-credentials -n "${NAMESPACE}" -o jsonpath='{.data.MONGODB_PASSWORD}' | base64 -d)
  MONGO_DB=$(oc get secret mongodb-credentials -n "${NAMESPACE}" -o jsonpath='{.data.MONGODB_DATABASE}' | base64 -d)
  MONGO_ADMIN_PASS=$(oc get secret mongodb-credentials -n "${NAMESPACE}" -o jsonpath='{.data.MONGODB_ADMIN_PASSWORD}' | base64 -d)
  MONGO_HOST="mongodb.${NAMESPACE}.svc.cluster.local"
  MONGO_PORT="27017"

  echo "  Host:           ${MONGO_HOST}"
  echo "  Port:           ${MONGO_PORT}"
  echo "  Database:       ${MONGO_DB}"
  echo "  Username:       ${MONGO_USER}"
  echo "  Password:       ${MONGO_PASS}"
  echo "  Admin Password: ${MONGO_ADMIN_PASS}"
  echo ""
  echo "  URI:            mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"
  echo "  Admin URI:      mongodb://admin:${MONGO_ADMIN_PASS}@${MONGO_HOST}:${MONGO_PORT}/admin"
fi

echo ""
echo "============================================"
