import { useState, useEffect } from 'react';
import { API_URLS } from '../config';

interface ServiceSpec {
  name: string;
  url: string;
  spec: string | null;
  error: string | null;
  loading: boolean;
}

function deriveOpenApiUrl(apiUrl: string, levelsUp: number): string {
  const parts = apiUrl.split('/');
  const trimmed = parts.slice(0, parts.length - levelsUp);
  return `${trimmed.join('/')}/q/openapi`;
}

const SERVICES = [
  { name: 'Person Service', url: deriveOpenApiUrl(API_URLS.persons, 2) },
  { name: 'Address Service', url: deriveOpenApiUrl(API_URLS.addresses, 2) },
  { name: 'People Service', url: deriveOpenApiUrl(API_URLS.people, 2) },
  { name: 'CDC Service', url: deriveOpenApiUrl(API_URLS.cdcEvents, 3) },
  { name: 'Chat Service', url: deriveOpenApiUrl(API_URLS.chatAsk, 2) },
];

export default function OpenApiPage() {
  const [specs, setSpecs] = useState<ServiceSpec[]>(
    SERVICES.map((s) => ({ ...s, spec: null, error: null, loading: true }))
  );
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    SERVICES.forEach((service, index) => {
      fetch(service.url)
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          let formatted: string;
          try {
            formatted = JSON.stringify(JSON.parse(text), null, 2);
          } catch {
            formatted = text;
          }
          setSpecs((prev) =>
            prev.map((s, i) => (i === index ? { ...s, spec: formatted, loading: false } : s))
          );
        })
        .catch((err) => {
          setSpecs((prev) =>
            prev.map((s, i) =>
              i === index ? { ...s, error: err instanceof Error ? err.message : 'Failed to load', loading: false } : s
            )
          );
        });
    });
  }, []);

  const current = specs[activeTab];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">OpenAPI Specifications</h1>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {specs.map((service, i) => (
          <button
            key={service.name}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
              i === activeTab
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {service.name}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{current.name}</h2>
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Raw Spec &rarr;
          </a>
        </div>
        <div className="p-5">
          {current.loading && (
            <div className="flex items-center justify-center h-32">
              <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
          {current.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {current.error}
            </div>
          )}
          {current.spec && (
            <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap">
              {current.spec}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
