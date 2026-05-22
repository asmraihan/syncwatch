import { useRef } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import FileDropZone from './FileDropZone';
import PlayerControls from './PlayerControls';

/**
 * Custom HTML5 video player. Shows the file drop zone until a local file
 * is loaded, then renders the <video> element with custom overlay controls.
 */
export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = usePlayerStore((s) => s.videoUrl);

  if (!videoUrl) {
    return <FileDropZone />;
  }

  return (
    <div className="group relative h-full w-full">
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full"
        // Custom controls only — never the browser default.
      />
      <PlayerControls videoRef={videoRef} />
    </div>
  );
}
