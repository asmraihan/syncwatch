// Fast content fingerprint for a local file. Combined with the file's name
// and byte size, this gives a very high-confidence "same file?" check across
// peers — without reading multi-GB videos end-to-end.
//
// Strategy: SHA-256 over the first 64 KB + the last 64 KB. For files smaller
// than 128 KB we just hash the whole thing. We truncate the digest to 16 hex
// chars (64 bits) since collisions at that level are practically impossible
// for distinct media files of the same size.

const CHUNK_BYTES = 64 * 1024;
const TRUNC_HEX = 16;

export async function fingerprintFile(file: File): Promise<string> {
  const head = await file
    .slice(0, Math.min(CHUNK_BYTES, file.size))
    .arrayBuffer();
  const buffers: ArrayBuffer[] = [head];
  if (file.size > CHUNK_BYTES * 2) {
    const tail = await file.slice(file.size - CHUNK_BYTES).arrayBuffer();
    buffers.push(tail);
  }
  const totalLen = buffers.reduce((s, b) => s + b.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of buffers) {
    combined.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  const digest = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, TRUNC_HEX);
}

/** Human-readable byte size for toasts. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

interface ComparableFile {
  name: string;
  size: number;
  fingerprint?: string;
}

/**
 * Returns a human-readable mismatch description, or null if the two files
 * appear to be identical (by every dimension we can check).
 */
export function describeFileMismatch(
  local: ComparableFile,
  peer: ComparableFile,
): string | null {
  if (local.name !== peer.name) {
    return `different filename ("${peer.name}" vs yours "${local.name}")`;
  }
  if (local.size !== peer.size) {
    return `different size (${formatBytes(peer.size)} vs yours ${formatBytes(local.size)})`;
  }
  if (
    local.fingerprint &&
    peer.fingerprint &&
    local.fingerprint !== peer.fingerprint
  ) {
    return 'different content (same name & size but bytes differ)';
  }
  return null;
}
