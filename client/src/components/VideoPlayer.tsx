import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useSync } from '../hooks/useSync';
import FileDropZone from './FileDropZone';
import PlayerControls from './PlayerControls';
import SubtitlePanel from './SubtitlePanel';
import AudioTrackPanel from './AudioTrackPanel';
import SyncIndicator from './SyncIndicator';

/**
 * Custom HTML5 video player. Shows the file drop zone until a local file
 * is loaded, then renders the <video> element with custom overlay controls.
 */
export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = usePlayerStore((s) => s.videoUrl);
  const tracks = usePlayerStore((s) => s.tracks);
  const activeLabel = usePlayerStore((s) => s.activeTrackLabel);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showAudio, setShowAudio] = useState(false);

  // Wire the sync protocol to the <video> element (no-op while ref is null).
  useSync(videoRef);

  // Switch the active text track mode whenever tracks or active label change.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const list = video.textTracks;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      t.mode = t.label === activeLabel ? 'showing' : 'disabled';
    }
  }, [tracks, activeLabel, videoUrl]);

  if (!videoUrl) {
    return <FileDropZone />;
  }

  return (
    <div className="group relative h-full w-full">
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full"
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }}
        crossOrigin="anonymous"
      >
        {tracks.map((t) => (
          <track
            key={`${t.label}-${t.vttUrl}`}
            kind="subtitles"
            src={t.vttUrl}
            label={t.label}
            srcLang="en"
            default={t.label === activeLabel}
          />
        ))}
      </video>
      <SyncIndicator />
      <PlayerControls
        videoRef={videoRef}
        onToggleSubtitles={() => {
          setShowSubtitles((v) => !v);
          setShowAudio(false);
        }}
        onToggleAudioTracks={() => {
          setShowAudio((v) => !v);
          setShowSubtitles(false);
        }}
      />
      {showSubtitles && <SubtitlePanel />}
      {showAudio && <AudioTrackPanel videoRef={videoRef} />}
    </div>
  );
}
