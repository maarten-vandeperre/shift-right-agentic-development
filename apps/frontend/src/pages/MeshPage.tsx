import { useState, useEffect, useCallback } from 'react';
import { API_URLS } from '../config';

interface FaultConfig {
  serviceName: string;
  faultType: 'delay' | 'abort';
  delayMs?: number;
  abortCode?: number;
  percentage: number;
  enabled: boolean;
}

interface TrafficBlockConfig {
  fromService: string;
  toService: string;
}

export default function MeshPage() {
  const [services, setServices] = useState<string[]>([]);
  const [faults, setFaults] = useState<FaultConfig[]>([]);
  const [blocks, setBlocks] = useState<TrafficBlockConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [faultService, setFaultService] = useState('');
  const [faultType, setFaultType] = useState<'delay' | 'abort'>('delay');
  const [delayMs, setDelayMs] = useState(500);
  const [abortCode, setAbortCode] = useState(503);
  const [percentage, setPercentage] = useState(100);
  const [faultEnabled, setFaultEnabled] = useState(true);
  const [faultSubmitting, setFaultSubmitting] = useState(false);

  const [blockFrom, setBlockFrom] = useState('');
  const [blockTo, setBlockTo] = useState('');
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  const base = API_URLS.meshConfig;

  const fetchAll = useCallback(async () => {
    try {
      const [svcRes, faultRes, blockRes] = await Promise.all([
        fetch(`${base}/services`),
        fetch(`${base}/faults`),
        fetch(`${base}/blocks`),
      ]);
      if (!svcRes.ok) throw new Error(`Services: HTTP ${svcRes.status}`);
      if (!faultRes.ok) throw new Error(`Faults: HTTP ${faultRes.status}`);
      if (!blockRes.ok) throw new Error(`Blocks: HTTP ${blockRes.status}`);

      const [svc, flt, blk] = await Promise.all([
        svcRes.json(),
        faultRes.json(),
        blockRes.json(),
      ]);
      setServices(svc);
      setFaults(flt);
      setBlocks(blk);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mesh data');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const applyFault = async () => {
    setFaultSubmitting(true);
    try {
      const body: FaultConfig = {
        serviceName: faultService,
        faultType,
        percentage,
        enabled: faultEnabled,
        ...(faultType === 'delay' ? { delayMs } : { abortCode }),
      };
      const res = await fetch(`${base}/faults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply fault');
    } finally {
      setFaultSubmitting(false);
    }
  };

  const deleteFault = async (serviceName: string) => {
    try {
      const res = await fetch(`${base}/faults/${encodeURIComponent(serviceName)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fault');
    }
  };

  const addBlock = async () => {
    setBlockSubmitting(true);
    try {
      const res = await fetch(`${base}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromService: blockFrom, toService: blockTo }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add block');
    } finally {
      setBlockSubmitting(false);
    }
  };

  const removeBlock = async (from: string, to: string) => {
    try {
      const res = await fetch(
        `${base}/blocks/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove block');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-6 w-6 text-indigo-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Service Mesh Configuration</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fault Injection */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Fault Injection</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
              <select
                value={faultService}
                onChange={(e) => setFaultService(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select a service</option>
                {services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fault Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="faultType"
                    value="delay"
                    checked={faultType === 'delay'}
                    onChange={() => setFaultType('delay')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Delay
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="faultType"
                    value="abort"
                    checked={faultType === 'abort'}
                    onChange={() => setFaultType('abort')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  Abort
                </label>
              </div>
            </div>

            {faultType === 'delay' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay (ms)</label>
                <input
                  type="number"
                  min={0}
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HTTP Status Code</label>
                <input
                  type="number"
                  min={400}
                  max={599}
                  value={abortCode}
                  onChange={(e) => setAbortCode(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Percentage: {percentage}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={faultEnabled}
                  onChange={(e) => setFaultEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
              </label>
              <span className="text-sm text-gray-700">{faultEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>

            <button
              onClick={applyFault}
              disabled={!faultService || faultSubmitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {faultSubmitting ? 'Applying…' : 'Apply Fault'}
            </button>
          </div>

          {faults.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Service</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Type</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Value</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">%</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Status</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {faults.map((f) => (
                    <tr key={f.serviceName} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-mono text-indigo-700">{f.serviceName}</td>
                      <td className="py-2 px-2 text-gray-600">{f.faultType}</td>
                      <td className="py-2 px-2 text-gray-600">
                        {f.faultType === 'delay' ? `${f.delayMs}ms` : `HTTP ${f.abortCode}`}
                      </td>
                      <td className="py-2 px-2 text-gray-600">{f.percentage}%</td>
                      <td className="py-2 px-2">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            f.enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {f.enabled ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => deleteFault(f.serviceName)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Traffic Blocking */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Traffic Blocking</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Service</label>
              <select
                value={blockFrom}
                onChange={(e) => setBlockFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select source</option>
                {services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Service</label>
              <select
                value={blockTo}
                onChange={(e) => setBlockTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select destination</option>
                {services.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={addBlock}
              disabled={!blockFrom || !blockTo || blockSubmitting}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {blockSubmitting ? 'Blocking…' : 'Block Traffic'}
            </button>
          </div>

          {blocks.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-700">From</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">To</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-700">Status</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b) => (
                    <tr key={`${b.fromService}-${b.toService}`} className="border-b border-gray-100">
                      <td className="py-2 px-2 font-mono text-indigo-700">{b.fromService}</td>
                      <td className="py-2 px-2 font-mono text-indigo-700">{b.toService}</td>
                      <td className="py-2 px-2">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                          blocked
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => removeBlock(b.fromService, b.toService)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
