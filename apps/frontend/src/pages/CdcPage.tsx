import { useEffect, useRef, useState } from 'react';
import { API_URLS } from '../config';

interface CdcEvent {
  timestamp: string;
  table: string;
  operation: string;
  ref: string;
  payload: string;
  before: string | null;
}

const OP_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function CdcPage() {
  const [events, setEvents] = useState<CdcEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const historyUrl = API_URLS.cdcEvents.replace(/\/events$/, '/history');
    fetch(historyUrl)
      .then((r) => r.json())
      .then((data: CdcEvent[]) => setEvents(data))
      .catch(() => {});

    const eventSource = new EventSource(API_URLS.cdcEvents);

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onmessage = (e) => {
      try {
        const event: CdcEvent = JSON.parse(e.data);
        setEvents((prev) => [...prev.slice(-499), event]);
      } catch {
        // skip malformed events
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      setError('Connection lost. Retrying...');
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  function formatPayload(raw: string): string {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CDC Events</h1>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              connected
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            {connected ? 'Connected' : 'Connecting...'}
          </span>
          <button
            onClick={() => setEvents([])}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 text-sm">
            No CDC events yet. Make a change in the Persons or Addresses tab to see
            Debezium capture it here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-auto">
          {events.map((ev, i) => (
            <div
              key={`${ev.timestamp}-${i}`}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    OP_COLORS[ev.operation] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ev.operation}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {ev.table}
                </span>
                <span className="font-mono text-xs text-gray-400">{ev.ref}</span>
                <span className="ml-auto text-xs text-gray-400">
                  {ev.timestamp}
                </span>
              </div>
              {ev.operation === 'UPDATE' && ev.before ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="mb-1 block text-xs font-medium text-red-500">Before</span>
                    <pre className="rounded-md bg-red-50 p-3 text-xs text-gray-700 overflow-x-auto max-h-40">
                      {formatPayload(ev.before)}
                    </pre>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-green-600">After</span>
                    <pre className="rounded-md bg-green-50 p-3 text-xs text-gray-700 overflow-x-auto max-h-40">
                      {formatPayload(ev.payload)}
                    </pre>
                  </div>
                </div>
              ) : (
                <pre className="rounded-md bg-gray-50 p-3 text-xs text-gray-700 overflow-x-auto max-h-40">
                  {formatPayload(ev.payload)}
                </pre>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
