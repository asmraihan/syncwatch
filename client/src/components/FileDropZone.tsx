import { useRef, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useWebSocketSend } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';
import { describeFileMismatch, fingerprintFile } from '../utils/fingerprint';

/** Drag-and-drop / click-to-browse zone for loading a local video file. */
export default function FileDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setFile = usePlayerStore((s) => s.setFile);
  const peerFiles = usePlayerStore((s) => s.peerFiles);
  const { send } = useWebSocketSend();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const loadFile = async (file: File) => {
    if (busy) return;
    setBusy(true);
    try {
      // Compute a quick content fingerprint *before* announcing the file so
      // peers (and the mismatch check) work with full identity info.
      const fingerprint = await fingerprintFile(file).catch(() => undefined);
      const meta = {
        name: file.name,
        size: file.size,
        type: file.type,
        fingerprint,
      };

      // Video data never leaves the device — only an object URL is created.
      const url = URL.createObjectURL(file);
      setFile(meta, url);
      send({
        type: 'file_info',
        name: file.name,
        size: file.size,
        fingerprint,
      });

      // Warn about any peer whose file differs (name / size / fingerprint).
      for (const [username, peerMeta] of Object.entries(peerFiles)) {
        const mismatch = describeFileMismatch(meta, peerMeta);
        if (mismatch) {
          show(
            `⚠️ Your file differs from ${username}'s — ${mismatch}. Sync may not work correctly.`,
            'warning',
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
      }}
      className="m-8 flex h-full max-h-[420px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-center transition-colors hover:border-accent"
    >
      <span className="text-4xl">🎬</span>
      <p className="mt-3 text-lg font-medium">
        {busy ? 'Hashing file...' : 'Drop your video file here'}
      </p>
      <p className="text-sm text-text-secondary">or click to browse</p>
      <p className="mt-3 text-xs text-text-muted">Supports MP4, WebM, MKV, AVI</p>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mkv,.avi"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
