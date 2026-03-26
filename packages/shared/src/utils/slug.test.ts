import { describe, it, expect } from 'vitest';
import { toSlug } from './slug.js';

describe('toSlug', () => {
  it('converts to lowercase', () => {
    expect(toSlug('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(toSlug('my workspace')).toBe('my-workspace');
  });

  it('removes special characters', () => {
    expect(toSlug('Hello! @World#')).toBe('hello-world');
  });

  it('trims leading/trailing hyphens', () => {
    expect(toSlug('  hello world  ')).toBe('hello-world');
  });

  it('replaces underscores with hyphens', () => {
    expect(toSlug('my_workspace_name')).toBe('my-workspace-name');
  });
});
