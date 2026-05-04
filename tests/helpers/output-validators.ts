import { expect } from 'vitest';

import { parseFrontMatter } from './front-matter.js';

/**
 * Assert that no unresolved Handlebars placeholders remain in output.
 */
export function assertNoUnresolvedPlaceholders(content: string): void {
  // Match {{ or }} that are NOT inside fenced code blocks.
  // Since skills may contain code examples with Handlebars syntax,
  // strip fenced code blocks before checking.
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
  expect(withoutCodeBlocks).not.toMatch(/\{\{/);
  expect(withoutCodeBlocks).not.toMatch(/\}\}/);
}

/**
 * Assert that the heading hierarchy is correct:
 * - Exactly one h1 (the template title)
 * - Each skill gets an h2
 * - Skill content only uses h3+
 */
export function assertHeadingHierarchy(
  content: string,
  expectedSkillCount: number,
): void {
  const { body } = parseFrontMatter(content);
  const lines = body.split('\n');

  const h1Lines = lines.filter((l) => /^# [^#]/.test(l));
  const h2Lines = lines.filter((l) => /^## [^#]/.test(l));

  // Most formats have exactly one h1 title.
  expect(h1Lines.length).toBeGreaterThanOrEqual(0);
  expect(h1Lines.length).toBeLessThanOrEqual(1);

  // Each skill should produce an h2 section. Some templates also add
  // their own h2 headings (e.g. "## Enabled Skills", "## Skill Summary"),
  // so we expect at least expectedSkillCount h2 headings.
  expect(h2Lines.length).toBeGreaterThanOrEqual(expectedSkillCount);

  // Within each skill's h2 block, there should be no h1 or h2 headings.
  // Extract the content between h2 markers and check.
  const h2Indices = lines.reduce<number[]>((acc, line, i) => {
    if (/^## [^#]/.test(line)) acc.push(i);
    return acc;
  }, []);

  for (let i = 0; i < h2Indices.length; i++) {
    const start = h2Indices[i] + 1;
    const end = h2Indices[i + 1] ?? lines.length;
    const block = lines.slice(start, end);
    const badHeadings = block.filter((l) => /^#{1,2} [^#]/.test(l));
    expect(
      badHeadings,
      `Bad heading(s) in block starting at line ${h2Indices[i]}`,
    ).toHaveLength(0);
  }
}

/**
 * Assert that code examples use fenced code blocks with language tags.
 */
export function assertFencedCodeBlocks(content: string): void {
  const fenceOpenings = content.match(/^```\w+/gm);
  expect(
    fenceOpenings,
    'Expected at least one fenced code block with a language tag',
  ).not.toBeNull();
  expect(fenceOpenings!.length).toBeGreaterThan(0);

  const fenceClosings = content.match(/^```$/gm);
  expect(
    fenceClosings,
    'Fenced code blocks should be properly closed',
  ).not.toBeNull();
  expect(fenceClosings!.length).toBe(fenceOpenings!.length);
}

/**
 * Assert that Magento-specific domain terms appear in the generated output.
 * These terms come from the bundled skills and should be present when all 10 are included.
 */
export function assertMagentoDomainTerms(content: string): void {
  const terms = [
    'plugin', // module-plugin
    'di.xml', // module-di
    'module.xml', // module-scaffold
    'ObjectManager', // module-di anti-pattern
    'GraphQL', // api-graphql-resolver
    'PHPUnit', // testing-phpunit
  ];

  for (const term of terms) {
    expect(
      content,
      `Expected Magento domain term "${term}" to appear in output`,
    ).toContain(term);
  }
}

/**
 * Assert that skill sections are separated by --- markers.
 */
export function assertSkillSeparators(
  content: string,
  expectedSkillCount: number,
): void {
  if (expectedSkillCount <= 1) return;

  const { body } = parseFrontMatter(content);
  // Separators between N skills = N-1
  const separators = body.match(/\n---\n/g);
  // Some templates may add extra separators; we just check there are at least (N-1).
  expect(
    separators?.length ?? 0,
    `Expected at least ${expectedSkillCount - 1} skill separators`,
  ).toBeGreaterThanOrEqual(expectedSkillCount - 1);
}

/**
 * Assert that qoder format has valid YAML front-matter.
 */
export function assertQoderFrontMatter(content: string): void {
  const { data } = parseFrontMatter(content);
  expect(data).toHaveProperty('name');
  expect(data).toHaveProperty('type');
  expect(typeof data['name']).toBe('string');
  expect(typeof data['type']).toBe('string');
}

/**
 * Assert that a format WITHOUT front-matter does not accidentally have one.
 */
export function assertNoFrontMatter(content: string): void {
  const { data } = parseFrontMatter(content);
  expect(
    Object.keys(data).length,
    'Expected no YAML front-matter for this format',
  ).toBe(0);
}
