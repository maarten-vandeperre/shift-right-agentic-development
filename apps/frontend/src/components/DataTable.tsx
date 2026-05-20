export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
}

export default function DataTable<T>({
  columns,
  rows,
  getKey,
  onEdit,
  onDelete,
}: Props<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map((c) => (
              <th
                key={c.header}
                className="px-4 py-3 text-left font-semibold text-gray-700"
              >
                {c.header}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-8 text-center text-gray-400"
              >
                No records found.
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={getKey(row)}
              className={`border-b border-gray-100 ${
                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
              }`}
            >
              {columns.map((c) => (
                <td key={c.header} className="px-4 py-3 text-gray-700">
                  {c.accessor(row)}
                </td>
              ))}
              <td className="px-4 py-3 text-right space-x-2">
                <button
                  onClick={() => onEdit(row)}
                  className="rounded bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(row)}
                  className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
