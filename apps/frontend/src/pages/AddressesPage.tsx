import { useCallback, useEffect, useState } from 'react';
import { API_URLS } from '../config';
import { getAll, create, update, remove } from '../api';
import DataTable, { type Column } from '../components/DataTable';
import FormModal, { type FieldDef } from '../components/FormModal';

interface Address {
  ref: string;
  line1: string;
  line2?: string;
  country: string;
}

const fields: FieldDef[] = [
  { name: 'line1', label: 'Line 1', required: true },
  { name: 'line2', label: 'Line 2', placeholder: 'optional' },
  { name: 'country', label: 'Country', required: true },
];

const columns: Column<Address>[] = [
  { header: 'Line 1', accessor: (r) => r.line1 },
  { header: 'Line 2', accessor: (r) => r.line2 || '—' },
  { header: 'Country', accessor: (r) => r.country },
];

const empty = { line1: '', line2: '', country: '' };

export default function AddressesPage() {
  const [rows, setRows] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...empty });

  const load = useCallback(() => {
    setLoading(true);
    getAll<Address>(API_URLS.addresses)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty });
    setShowForm(true);
  }

  function openEdit(row: Address) {
    setEditing(row);
    setForm({
      line1: row.line1,
      line2: row.line2 ?? '',
      country: row.country,
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    const body = { ...form };
    if (editing) {
      await update(API_URLS.addresses, editing.ref, body);
    } else {
      await create(API_URLS.addresses, body);
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(row: Address) {
    if (!window.confirm(`Delete address "${row.line1}, ${row.country}"?`))
      return;
    await remove(API_URLS.addresses, row.ref);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Addresses</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
        >
          + Create New
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          getKey={(r) => r.ref}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {showForm && (
        <FormModal
          title={editing ? 'Edit Address' : 'Create Address'}
          fields={fields}
          values={form}
          onChange={(n, v) => setForm((f) => ({ ...f, [n]: v }))}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
