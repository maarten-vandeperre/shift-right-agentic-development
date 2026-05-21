#!/bin/sh
cat > /tmp/config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  PERSON_API: "${VITE_PERSON_API:-http://localhost:8081/api/persons}",
  ADDRESS_API: "${VITE_ADDRESS_API:-http://localhost:8082/api/addresses}",
  PEOPLE_API: "${VITE_PEOPLE_API:-http://localhost:8083/api/people}",
  CDC_API: "${VITE_CDC_API:-http://localhost:8084/api/cdc/events}",
  CHAT_API: "${VITE_CHAT_API:-http://localhost:8085/api/chat}",
  MESH_API: "${VITE_MESH_API:-http://localhost:8086/api/mesh}",
  KIALI_URL: "${VITE_KIALI_URL:-http://localhost:20001}"
};
EOF
cp /tmp/config.js /opt/app-root/src/config.js 2>/dev/null || true
exec nginx -g "daemon off;"
