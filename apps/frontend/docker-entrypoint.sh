#!/bin/sh
cat > /tmp/config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  PERSON_API: "${VITE_PERSON_API:-/proxy/persons/api/persons}",
  ADDRESS_API: "${VITE_ADDRESS_API:-/proxy/addresses/api/addresses}",
  PEOPLE_API: "${VITE_PEOPLE_API:-/proxy/people/api/people}",
  CDC_API: "${VITE_CDC_API:-/proxy/cdc/api/cdc/events}",
  CHAT_API: "${VITE_CHAT_API:-/proxy/chat/api/chat}",
  MESH_API: "${VITE_MESH_API:-/proxy/mesh/api/mesh}",
  KIALI_URL: "${VITE_KIALI_URL:-http://localhost:20001}"
};
EOF
cp /tmp/config.js /opt/app-root/src/config.js 2>/dev/null || true
exec nginx -g "daemon off;"
