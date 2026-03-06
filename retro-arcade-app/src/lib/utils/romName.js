const ARCHIVE_EXTENSIONS = ['.zip', '.7z'];
const ROM_EXTENSIONS = [
  '.nes',
  '.sfc',
  '.smc',
  '.gb',
  '.gbc',
  '.gba',
  '.md',
  '.smd',
  '.bin',
  '.gen',
  '.sms',
  '.z64',
  '.n64',
  '.v64',
  '.cue',
  '.chd',
  '.pbp',
  '.iso',
  '.img',
  '.cdi',
  '.gdi',
  '.pce',
  '.ngp',
  '.ws',
  '.wsc'
];

function stripExtension(name, extensions) {
  const lower = name.toLowerCase();
  const matched = extensions.find((ext) => lower.endsWith(ext));
  if (!matched) return name;
  return name.slice(0, -matched.length);
}

export function normalizeRomDisplayName(fileName) {
  const original = fileName?.trim?.() || '';
  if (!original) return '';

  let normalized = original;
  normalized = stripExtension(normalized, ARCHIVE_EXTENSIONS);
  normalized = stripExtension(normalized, ROM_EXTENSIONS);

  return normalized.trim() || original;
}
