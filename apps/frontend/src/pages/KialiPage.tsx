import { useState } from 'react';
import { API_URLS } from '../config';

export default function KialiPage() {
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kiali Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-mono">{API_URLS.kialiUrl}</span>
          <a
            href={API_URLS.kialiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
          >
            Open in New Tab
          </a>
        </div>
      </div>

      {iframeError ? (
        <div className="flex-1 flex items-center justify-center rounded-lg border border-gray-200 bg-white">
          <div className="text-center p-8">
            <p className="text-gray-700 text-lg font-medium mb-2">
              Unable to embed Kiali dashboard
            </p>
            <p className="text-gray-500 text-sm mb-4">
              The Kiali server may block embedding via X-Frame-Options.
            </p>
            <a
              href={API_URLS.kialiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              Open Kiali Directly
            </a>
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-lg border border-gray-200 overflow-hidden">
          <iframe
            src={API_URLS.kialiUrl}
            className="w-full h-full border-0"
            title="Kiali"
            onError={() => setIframeError(true)}
          />
        </div>
      )}
    </div>
  );
}
