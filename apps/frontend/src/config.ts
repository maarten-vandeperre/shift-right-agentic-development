interface RuntimeConfig {
  PERSON_API?: string;
  ADDRESS_API?: string;
  PEOPLE_API?: string;
  CDC_API?: string;
  CHAT_API?: string;
  MESH_API?: string;
  KIALI_URL?: string;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

const runtime = window.__RUNTIME_CONFIG__ || {};

export const API_URLS = {
  persons: runtime.PERSON_API || import.meta.env.VITE_PERSON_API || 'http://localhost:8081/api/persons',
  addresses: runtime.ADDRESS_API || import.meta.env.VITE_ADDRESS_API || 'http://localhost:8082/api/addresses',
  people: runtime.PEOPLE_API || import.meta.env.VITE_PEOPLE_API || 'http://localhost:8083/api/people',
  cdcEvents: runtime.CDC_API || import.meta.env.VITE_CDC_API || 'http://localhost:8084/api/cdc/events',
  chatAsk: runtime.CHAT_API || import.meta.env.VITE_CHAT_API || 'http://localhost:8085/api/chat',
  meshConfig: runtime.MESH_API || import.meta.env.VITE_MESH_API || 'http://localhost:8086/api/mesh',
  kialiUrl: runtime.KIALI_URL || import.meta.env.VITE_KIALI_URL || 'http://localhost:20001',
};
