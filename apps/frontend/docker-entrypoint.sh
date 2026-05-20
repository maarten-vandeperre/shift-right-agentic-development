#!/bin/sh
cat > /opt/app-root/src/config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  PERSON_API: "${VITE_PERSON_API:-http://localhost:8081/api/persons}",
  ADDRESS_API: "${VITE_ADDRESS_API:-http://localhost:8082/api/addresses}",
  PEOPLE_API: "${VITE_PEOPLE_API:-http://localhost:8083/api/people}"
};
EOF
exec /usr/libexec/s2i/run
