import { useRef } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';

/** Drag-and-drop / click-to-browse zone for loading a local video file. */
export default function FileDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setFile = usePlayerStore((s) => s.setFile);

  const loadFile = (file: File) => {
    // Video data never leaves the device — only an object URL is created.
    const url = URL.createObjectURL(file);
    setFile({ name: file.name, size: file.size, type: file.type }, url);
    // TODO(sync phase): emit file_info to the room.
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
      <p className="mt-3 text-lg font-medium">Drop your video file here</p>
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
        }}
      />
    </div>
  );
}
