/**
 * Subtitle loading, sharing, and persistence.
 *
 * Responsibilities (to be implemented in the subtitle phase):
 *  - Parse uploaded files via utils/subtitleParser
 *  - Share parsed cues over WebSocket (`subtitle_share`)
 *  - On receive: build a VTT blob URL, attach a <track>, persist to IndexedDB
 *  - Restore stored tracks for the room on join (utils/db)
 *  - Apply local-only timing offsets (regenerate VTT blob on change)
 */
export function useSubtitles() {
  // TODO(subtitle phase): implement upload/share/persist/offset flow.
}
