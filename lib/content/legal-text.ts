// The plain-text format the owner writes legal pages in:
//   ## Heading           a line starting with "## " is a section heading
//   - item               lines starting with "- " form a bulleted list
//   (blank line)         separates paragraphs
// Other lines in a paragraph are kept as line breaks (addresses, the
// cancellation form). No HTML is ever interpreted.

export type LegalBlock =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; lines: string[] };

export function parseLegalText(body: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", lines: paragraph });
    if (list.length) blocks.push({ kind: "list", items: list });
    paragraph = [];
    list = [];
  };

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "heading", text: line.slice(3).trim() });
    } else if (/^[-•*]\s+/.test(line)) {
      if (paragraph.length) flush();
      list.push(line.replace(/^[-•*]\s+/, ""));
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

// Splits a line into text and links: https:// URLs and email addresses.
export type LegalSpan =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

const LINK = /(https:\/\/[^\s)]+[^\s).,;:!?]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

export function linkify(line: string): LegalSpan[] {
  const spans: LegalSpan[] = [];
  let last = 0;
  for (const match of line.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) spans.push({ kind: "text", text: line.slice(last, index) });
    const text = match[0];
    spans.push({
      kind: "link",
      text,
      href: text.startsWith("https://") ? text : `mailto:${text}`,
    });
    last = index + text.length;
  }
  if (last < line.length) spans.push({ kind: "text", text: line.slice(last) });
  return spans;
}
