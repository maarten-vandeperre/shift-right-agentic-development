import { useCallback, useEffect, useState } from 'react';
import { API_URLS } from '../config';
import { getAll, create, update, remove } from '../api';
import DataTable, { type Column } from '../components/DataTable';
import FormModal, { type FieldDef } from '../components/FormModal';

interface PersonAddress {
  ref: string;
  line1: string;
  line2?: string;
  country: string;
}

interface People {
  ref: string;
  firstName: string;
  lastName: string;
  email: string;
  address: PersonAddress;
}

const fields: FieldDef[] = [
  { name: 'firstName', label: 'First Name', required: true },
  { name: 'lastName', label: 'Last Name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'address.ref', label: 'Address Ref', placeholder: 'optional' },
  { name: 'address.line1', label: 'Address Line 1', required: true },
  { name: 'address.line2', label: 'Address Line 2', placeholder: 'optional' },
  { name: 'address.country', label: 'Address Country', required: true },
];

const columns: Column<People>[] = [
  { header: 'First Name', accessor: (r) => r.firstName },
  { header: 'Last Name', accessor: (r) => r.lastName },
  { header: 'Email', accessor: (r) => r.email },
  {
    header: 'Address',
    accessor: (r) =>
      r.address
        ? `${r.address.line1}${r.address.line2 ? ', ' + r.address.line2 : ''}, ${r.address.country}`
        : '—',
  },
];

function flatten(row: People): Record<string, string> {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    'address.ref': row.address?.ref ?? '',
    'address.line1': row.address?.line1 ?? '',
    'address.line2': row.address?.line2 ?? '',
    'address.country': row.address?.country ?? '',
  };
}

function unflatten(form: Record<string, string>) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    address: {
      ref: form['address.ref'] || undefined,
      line1: form['address.line1'],
      line2: form['address.line2'] || undefined,
      country: form['address.country'],
    },
  };
}

const empty: Record<string, string> = {
  firstName: '',
  lastName: '',
  email: '',
  'address.ref': '',
  'address.line1': '',
  'address.line2': '',
  'address.country': '',
};

export default function PeoplePage() {
  const [rows, setRows] = useState<People[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<People | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...empty });

  const load = useCallback(() => {
    setLoading(true);
    getAll<People>(API_URLS.people)
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

  function openEdit(row: People) {
    setEditing(row);
    setForm(flatten(row));
    setShowForm(true);
  }

  async function handleSubmit() {
    const body = unflatten(form);
    if (editing) {
      await update(API_URLS.people, editing.ref, body);
    } else {
      await create(API_URLS.people, body);
    }
    setShowForm(false);
    load();
  }

  async function handleDelete(row: People) {
    if (!window.confirm(`Delete person "${row.firstName} ${row.lastName}"?`))
      return;
    await remove(API_URLS.people, row.ref);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">People</h1>
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
