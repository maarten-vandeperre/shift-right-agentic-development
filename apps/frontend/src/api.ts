export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getAll<T>(baseUrl: string) {
  return apiFetch<T[]>(baseUrl);
}

export function getOne<T>(baseUrl: string, ref: string) {
  return apiFetch<T>(`${baseUrl}/${ref}`);
}

export function create<T>(baseUrl: string, body: unknown) {
  return apiFetch<T>(baseUrl, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function update<T>(baseUrl: string, ref: string, body: unknown) {
  return apiFetch<T>(`${baseUrl}/${ref}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function remove(baseUrl: string, ref: string) {
  return apiFetch<void>(`${baseUrl}/${ref}`, { method: 'DELETE' });
}
