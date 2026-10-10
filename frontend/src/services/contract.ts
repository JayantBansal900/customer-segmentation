import openapi from '../types/openapi.json';

interface Schema {
  $ref?: string;
  anyOf?: Schema[];
  type?: string;
  enum?: unknown[];
  const?: unknown;
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  additionalProperties?: boolean | Schema;
}

const schemas = openapi.components.schemas as Record<string, Schema>;

/** Check the actual saved OpenAPI response schema at runtime, including arrays/nulls. */
function matches(value: unknown, schema: Schema): boolean {
  if (schema.$ref) {
    const resolved = schemas[schema.$ref.split('/').pop()!];
    return !!resolved && matches(value, resolved);
  }
  if (schema.anyOf) return schema.anyOf.some(option => matches(value, option));
  if (schema.enum && !schema.enum.includes(value)) return false;
  if ('const' in schema && value !== schema.const) return false;
  if (schema.type === 'null') return value === null;
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (schema.type === 'integer') return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
  if (schema.type === 'string') return typeof value === 'string';
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type === 'array') return Array.isArray(value) && value.every(item => !schema.items || matches(item, schema.items));
  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    if (schema.required?.some(key => !(key in record))) return false;
    return Object.entries(record).every(([key, item]) => {
      if (schema.properties?.[key]) return matches(item, schema.properties[key]);
      if (schema.additionalProperties === false) return false;
      return typeof schema.additionalProperties !== 'object' || matches(item, schema.additionalProperties);
    });
  }
  return true;
}

export function matchesContract(value: unknown, name: string): boolean {
  return !!schemas[name] && matches(value, schemas[name]);
}
