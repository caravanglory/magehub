import { describe, expect, it } from 'vitest';

import {
  parseSkillCategory,
  parseOutputFormat,
} from '../../src/utils/validation.js';
import { CliError } from '../../src/utils/cli-error.js';

describe('parseSkillCategory', () => {
  it('returns undefined for undefined input', () => {
    expect(parseSkillCategory(undefined)).toBeUndefined();
  });

  it('returns valid category as-is', () => {
    expect(parseSkillCategory('module')).toBe('module');
    expect(parseSkillCategory('api')).toBe('api');
    expect(parseSkillCategory('admin')).toBe('admin');
    expect(parseSkillCategory('frontend')).toBe('frontend');
    expect(parseSkillCategory('hyva')).toBe('hyva');
    expect(parseSkillCategory('testing')).toBe('testing');
    expect(parseSkillCategory('performance')).toBe('performance');
    expect(parseSkillCategory('upgrade')).toBe('upgrade');
    expect(parseSkillCategory('devops')).toBe('devops');
    expect(parseSkillCategory('standards')).toBe('standards');
  });

  it('throws CliError for invalid category', () => {
    expect(() => parseSkillCategory('invalid')).toThrow(CliError);
    expect(() => parseSkillCategory('invalid')).toThrow(
      'Unsupported category: invalid',
    );
  });

  it('throws with exit code 1', () => {
    try {
      parseSkillCategory('bad');
    } catch (e) {
      expect(e).toBeInstanceOf(CliError);
      expect((e as CliError).exitCode).toBe(1);
    }
  });
});

describe('parseOutputFormat', () => {
  it('returns format when valid', () => {
    expect(parseOutputFormat('claude', 'claude')).toBe('claude');
    expect(parseOutputFormat('opencode', 'claude')).toBe('opencode');
    expect(parseOutputFormat('codex', 'claude')).toBe('codex');
    expect(parseOutputFormat('qoder', 'claude')).toBe('qoder');
  });

  it('returns fallback when value is undefined', () => {
    expect(parseOutputFormat(undefined, 'claude')).toBe('claude');
    expect(parseOutputFormat(undefined, 'codex')).toBe('codex');
  });

  it('throws CliError for invalid format', () => {
    expect(() => parseOutputFormat('bad-format', 'claude')).toThrow(CliError);
    expect(() => parseOutputFormat('bad-format', 'claude')).toThrow(
      'Unsupported output format: bad-format',
    );
  });

  it('rejects the removed markdown format', () => {
    expect(() => parseOutputFormat('markdown', 'claude')).toThrow(
      'Unsupported output format: markdown',
    );
  });

  it('throws with exit code 1', () => {
    try {
      parseOutputFormat('invalid', 'claude');
    } catch (e) {
      expect(e).toBeInstanceOf(CliError);
      expect((e as CliError).exitCode).toBe(1);
    }
  });
});

describe('CliError', () => {
  it('has the correct name', () => {
    const err = new CliError('test', 2);
    expect(err.name).toBe('CliError');
  });

  it('carries exit code', () => {
    const err = new CliError('test', 3);
    expect(err.exitCode).toBe(3);
    expect(err.message).toBe('test');
  });

  it('is an instance of Error', () => {
    const err = new CliError('test', 1);
    expect(err).toBeInstanceOf(Error);
  });
});
