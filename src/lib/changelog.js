// Reads the newest release out of CHANGELOG.md (Keep a Changelog format) so the
// About section never drifts from the changelog.
const plain = (line) =>
  line
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();

export function latestChanges(markdown) {
  const lines = String(markdown || '').split('\n');
  const start = lines.findIndex((l) => /^## \[/.test(l));
  if (start < 0) return [];
  const groups = [];
  for (const line of lines.slice(start + 1)) {
    if (/^## /.test(line)) break;
    const heading = /^### (.+)/.exec(line);
    if (heading) groups.push({ heading: heading[1].trim(), items: [] });
    else if (/^- /.test(line) && groups.length) groups[groups.length - 1].items.push(plain(line.slice(2)));
  }
  return groups.filter((g) => g.items.length);
}
