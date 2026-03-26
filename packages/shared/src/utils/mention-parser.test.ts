import { describe, it, expect } from 'vitest';
import { parseMentions } from './mention-parser.js';

describe('parseMentions', () => {
  it('extracts single mention', () => {
    const result = parseMentions('Hello @alice!');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('alice');
    expect(result[0].raw).toBe('@alice');
  });

  it('extracts multiple mentions', () => {
    const result = parseMentions('@alice can you review @bob.agent work?');
    expect(result).toHaveLength(2);
    expect(result[0].displayName).toBe('alice');
    expect(result[1].displayName).toBe('bob.agent');
  });

  it('handles mentions with dots, hyphens, underscores', () => {
    const result = parseMentions('@code-reviewer_v2.1 check this');
    expect(result).toHaveLength(1);
    expect(result[0].displayName).toBe('code-reviewer_v2.1');
  });

  it('returns empty for no mentions', () => {
    const result = parseMentions('Hello world, no mentions here');
    expect(result).toHaveLength(0);
  });

  it('captures index position', () => {
    const result = parseMentions('Hey @alice!');
    expect(result[0].index).toBe(4);
  });
});
