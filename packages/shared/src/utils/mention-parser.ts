export interface ParsedMention {
  raw: string;
  displayName: string;
  index: number;
}

export function parseMentions(content: string): ParsedMention[] {
  // Regex must be declared inside the function — a module-scoped /g regex
  // is stateful (lastIndex persists between calls) causing duplicate/missed matches.
  const MENTION_REGEX = /@([a-zA-Z0-9_.-]+)/g;
  const mentions: ParsedMention[] = [];
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    mentions.push({
      raw: match[0],
      displayName: match[1],
      index: match.index,
    });
  }

  return mentions;
}
