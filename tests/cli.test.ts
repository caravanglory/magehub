import { describe, expect, it } from 'vitest';

import { createCli } from '../src/cli.js';
import { resolveShorthand } from '../src/utils/shorthand.js';

describe('createCli', () => {
  it('registers the documented v1 command skeleton', () => {
    const names = createCli().commands.map((command) => command.name());

    expect(names).toContain('setup:init');
    expect(names).toContain('skill:list');
    expect(names).toContain('skill:search');
    expect(names).toContain('skill:show');
    expect(names).toContain('skill:install');
    expect(names).toContain('skill:remove');
    expect(names).toContain('skill:verify');
    expect(names).toContain('config:show');
    expect(names).toContain('config:validate');
    expect(names).toContain('generate');
  });
});

describe('resolveShorthand', () => {
  it('returns the unique matching command', () => {
    expect(resolveShorthand('g', ['generate', 'skill:list'])).toBe('generate');
  });

  it('throws on ambiguity', () => {
    expect(() =>
      resolveShorthand('skill:s', ['skill:search', 'skill:show']),
    ).toThrow('Ambiguous shorthand: skill:s');
  });
});
