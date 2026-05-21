import { useCallback, useEffect, useMemo, useState } from 'react';
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

interface Address {
  ref: string;
  line1: string;
  line2: string | null;
  country: string;
}

const empty = { firstName: '', lastName: '', email: '', addressRef: '' };

export default function PersonsPage() {
  const [rows, setRows] = useState<Person[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...empty });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getAll<Person>(API_URLS.persons),
      getAll<Address>(API_URLS.addresses),
    ])
      .then(([people, addrs]) => {
        setRows(people);
        setAddresses(addrs);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addressMap = useMemo(() => {
    const m = new Map<string, Address>();
    addresses.forEach((a) => m.set(a.ref, a));
    return m;
  }, [addresses]);

  const addressOptions = useMemo(
    () =>
      addresses.map((a) => ({
        value: a.ref,
        label: `${a.line1}${a.line2 ? ', ' + a.line2 : ''} — ${a.country}`,
      })),
    [addresses],
  );

  const fields: FieldDef[] = useMemo(
    () => [
      { name: 'firstName', label: 'First Name', required: true },
      { name: 'lastName', label: 'Last Name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      {
        name: 'addressRef',
        label: 'Address',
        placeholder: '— select an address —',
        options: addressOptions,
      },
    ],
    [addressOptions],
  );

  const columns: Column<Person>[] = [
    { header: 'First Name', accessor: (r) => r.firstName },
    { header: 'Last Name', accessor: (r) => r.lastName },
    { header: 'Email', accessor: (r) => r.email },
    {
      header: 'Address',
      accessor: (r) => {
        const a = addressMap.get(r.addressRef);
        if (!a) return <span className="text-gray-400">—</span>;
        return (
          <span className="text-sm">
            {a.line1}, {a.country}
          </span>
        );
      },
    },
  ];

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
