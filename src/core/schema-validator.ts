import { readFile } from 'node:fs/promises';

import AjvModule, { type ErrorObject, type ValidateFunction } from 'ajv';

import type { MageHubConfig } from '../types/config.js';
import type { RawSkill } from '../types/skill.js';
import { resolveBundledSchemaPath } from './runtime-assets.js';

export interface SchemaValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
}

const Ajv = AjvModule.default ?? AjvModule;

const validatorCache = new Map<string, Promise<ValidateFunction>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeLegacyTool(value: unknown): unknown {
  return value === 'cursor' ? 'claude' : value;
}

function normalizeLegacyConfigPayload(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  let result = { ...payload };

  if (result.format !== undefined) {
    result = {
      ...result,
      format: normalizeLegacyTool(result.format),
    };
  }

  if (Array.isArray(result.skills)) {
    result = {
      ...result,
      skills: result.skills.map((entry: unknown) =>
        typeof entry === 'string' ? { id: entry } : entry,
      ),
    };
  }

  return result;
}

function normalizeLegacySkillPayload(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.compatibility)) {
    return payload;
  }

  return {
    ...payload,
    compatibility: payload.compatibility.map((entry) =>
      normalizeLegacyTool(entry),
    ),
  };
}

function formatAjvError(error: ErrorObject): string {
  const location = error.instancePath === '' ? '/' : error.instancePath;
  return `${location} ${error.message ?? 'Validation error'}`;
}

async function getValidator(schemaFileName: string): Promise<ValidateFunction> {
  const schemaPath = resolveBundledSchemaPath(schemaFileName);

  const cached = validatorCache.get(schemaPath);
  if (cached !== undefined) {
    return cached;
  }

  const validatorPromise = readFile(schemaPath, 'utf8').then((content) => {
    const schema = JSON.parse(content) as object;
    const ajv = new Ajv({ allErrors: true, strict: false });
    return ajv.compile(schema);
  });

  validatorCache.set(schemaPath, validatorPromise);
  return validatorPromise;
}

async function validateAgainstSchema<T>(
  schemaFileName: string,
  payload: unknown,
): Promise<SchemaValidationResult<T>> {
  const validator = await getValidator(schemaFileName);
  const valid = validator(payload);

  return {
    valid,
    data: valid ? (payload as T) : undefined,
    errors: valid ? [] : (validator.errors ?? []).map(formatAjvError),
  };
}

export function clearSchemaValidatorCache(): void {
  validatorCache.clear();
}

export async function validateSkillSchema(
  payload: unknown,
): Promise<SchemaValidationResult<RawSkill>> {
  return validateAgainstSchema<RawSkill>(
    'skill.schema.json',
    normalizeLegacySkillPayload(payload),
  );
}

export async function validateConfigSchema(
  payload: unknown,
): Promise<SchemaValidationResult<MageHubConfig>> {
  return validateAgainstSchema<MageHubConfig>(
    'config.schema.json',
    normalizeLegacyConfigPayload(payload),
  );
}
