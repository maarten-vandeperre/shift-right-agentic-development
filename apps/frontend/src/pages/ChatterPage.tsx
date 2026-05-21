import { useState, useEffect, useRef } from 'react';
import { API_URLS } from '../config';

interface ChatterConfig {
  orchestratorUrl: string;
  orchestratorApiKey: string;
  orchestratorModel: string;
  locationUrl: string;
  locationApiKey: string;
  locationModel: string;
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

const DEFAULT_CONFIG: ChatterConfig = {
  orchestratorUrl: 'https://api.openai.com/v1',
  orchestratorApiKey: '',
  orchestratorModel: 'gpt-4',
  locationUrl: 'https://api.openai.com/v1',
  locationApiKey: '',
  locationModel: 'gpt-4',
};

function loadConfig(): ChatterConfig {
  try {
    const stored = localStorage.getItem('chatter-config');
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export default function ChatterPage() {
  const [config, setConfig] = useState<ChatterConfig>(loadConfig);
  const [configOpen, setConfigOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('chatter-config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateConfig = (field: keyof ChatterConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URLS.chatAsk}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          orchestratorUrl: config.orchestratorUrl,
          orchestratorApiKey: config.orchestratorApiKey,
          orchestratorModel: config.orchestratorModel,
          locationUrl: config.locationUrl,
          locationApiKey: config.locationApiKey,
          locationModel: config.locationModel,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || 'No response.',
          toolCalls: data.toolCalls,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      <div className="mb-4">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Model Configuration
          <svg className={`w-4 h-4 transition-transform ${configOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {configOpen && (
          <div className="mt-3 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Orchestrator Model</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="URL (e.g., https://api.openai.com/v1)"
                    value={config.orchestratorUrl}
                    onChange={(e) => updateConfig('orchestratorUrl', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="password"
                    placeholder="API Key (optional)"
                    value={config.orchestratorApiKey}
                    onChange={(e) => updateConfig('orchestratorApiKey', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Model name (e.g., gpt-4)"
                    value={config.orchestratorModel}
                    onChange={(e) => updateConfig('orchestratorModel', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Location Model</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="URL (e.g., https://api.openai.com/v1)"
                    value={config.locationUrl}
                    onChange={(e) => updateConfig('locationUrl', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="password"
                    placeholder="API Key (optional)"
                    value={config.locationApiKey}
                    onChange={(e) => updateConfig('locationApiKey', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Model name (e.g., gpt-4)"
                    value={config.locationModel}
                    onChange={(e) => updateConfig('locationModel', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Start a conversation...
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200/30">
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`text-xs font-medium ${isUser ? 'text-indigo-200' : 'text-gray-500'} hover:underline`}
            >
              {toolsOpen ? 'Hide' : 'Show'} tool calls ({message.toolCalls.length})
            </button>
            {toolsOpen && (
              <div className="mt-2 space-y-2">
                {message.toolCalls.map((tc, i) => (
                  <div key={i} className={`text-xs p-2 rounded-lg ${isUser ? 'bg-indigo-700/50' : 'bg-gray-200'}`}>
                    <div className="font-semibold">{tc.name}</div>
                    <div className="mt-1 font-mono break-all">{JSON.stringify(tc.arguments)}</div>
                    {tc.result && <div className="mt-1 opacity-80">{tc.result}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
