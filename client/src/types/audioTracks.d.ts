// Ambient declarations for the non-standard but widely-implemented
// HTMLMediaElement.audioTracks API. Safari has the most complete support;
// Chrome and Firefox typically expose only a single track per file.

interface AudioTrack {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  enabled: boolean;
}

interface AudioTrackList extends EventTarget {
  readonly length: number;
  [index: number]: AudioTrack;
  getTrackById(id: string): AudioTrack | null;
  onaddtrack: ((this: AudioTrackList, ev: Event) => unknown) | null;
  onremovetrack: ((this: AudioTrackList, ev: Event) => unknown) | null;
  onchange: ((this: AudioTrackList, ev: Event) => unknown) | null;
}

interface HTMLMediaElement {
  readonly audioTracks?: AudioTrackList;
}
