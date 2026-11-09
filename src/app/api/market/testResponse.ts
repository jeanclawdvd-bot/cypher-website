/** Validate the JSON shape before route tests inspect response fields. */
export function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a JSON object');
  }
  return value as Record<string, unknown>;
}

export function objectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new TypeError('Expected a JSON array');
  return value.map(objectValue);
}

export async function readJsonObject(response: { json(): Promise<unknown> }) {
  return objectValue(await response.json());
}
