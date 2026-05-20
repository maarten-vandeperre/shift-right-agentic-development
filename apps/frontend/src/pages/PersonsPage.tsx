import { useCallback, useEffect, useState } from 'react';
import { API_URLS } from '../config';
import { getAll, create, update, remove } from '../api';
import DataTable, { type Column } from '../components/DataTable';
import FormModal, { type FieldDef } from '../components/FormModal';

interface Person {
  ref: string;
  firstName: string;
  lastName: string;
  email: string;
  addressRef: string;
}

const fields: FieldDef[] = [
  { name: 'firstName', label: 'First Name', required: true },
  { name: 'lastName', label: 'Last Name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'addressRef', label: 'Address Ref (UUID)', placeholder: 'optional' },
];

const columns: Column<Person>[] = [
  { header: 'First Name', accessor: (r) => r.firstName },
  { header: 'Last Name', accessor: (r) => r.lastName },
  { header: 'Email', accessor: (r) => r.email },
  {
    header: 'Address Ref',
    accessor: (r) => (
      <span className="font-mono text-xs text-gray-500">
        {r.addressRef || '—'}
      </span>
    ),
  },
];

const empty = { firstName: '', lastName: '', email: '', addressRef: '' };

export default function PersonsPage() {
  const [rows, setRows] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...empty });

  const load = useCallback(() => {
    setLoading(true);
    getAll<Person>(API_URLS.persons)
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

  function openEdit(row: Person) {
    setEditing(row);
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      addressRef: row.addressRef ?? '',
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    const body = { ...form };
    if (editing) {
      await update(API_URLS.persons, editing.ref, body);
    } else {
      await create(API_URLS.persons, body);
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(row: Person) {
    if (!window.confirm(`Delete person "${row.firstName} ${row.lastName}"?`))
      return;
    await remove(API_URLS.persons, row.ref);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Persons</h1>
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
          title={editing ? 'Edit Person' : 'Create Person'}
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
