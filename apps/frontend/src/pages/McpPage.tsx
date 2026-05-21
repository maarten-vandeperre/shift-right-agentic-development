import { useState, useEffect } from 'react';
import { API_URLS } from '../config';

interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface McpTool {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export default function McpPage() {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await fetch(`${API_URLS.chatAsk}/mcp/tools`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTools(Array.isArray(data) ? data : data.tools || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tools');
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

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

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">MCP Tool Definitions</h1>
      <div className="grid gap-4">
        {tools.map((tool) => (
          <div key={tool.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">{tool.name}</h2>
            <p className="mt-1 text-sm text-gray-600">{tool.description}</p>
            {tool.parameters && tool.parameters.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Required</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tool.parameters.map((param) => (
                      <tr key={param.name} className="border-b border-gray-100">
                        <td className="py-2 px-3 font-mono text-indigo-700">{param.name}</td>
                        <td className="py-2 px-3 text-gray-600">{param.type}</td>
                        <td className="py-2 px-3">
                          {param.required ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">yes</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">no</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-600">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {tools.length === 0 && (
          <p className="text-gray-500 text-sm">No tools found.</p>
        )}
      </div>
    </div>
  );
}
