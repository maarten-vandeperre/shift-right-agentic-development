import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/persons', label: 'Persons' },
  { to: '/addresses', label: 'Addresses' },
  { to: '/people', label: 'People' },
  { to: '/cdc', label: 'CDC Events' },
  { to: '/chat', label: 'Chatter Time' },
  { to: '/mcp', label: 'MCP' },
  { to: '/openapi', label: 'OpenAPI' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            Admin Panel
          </h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
