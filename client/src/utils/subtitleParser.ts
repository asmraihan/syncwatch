import type { SubtitleCue } from '../types';

/**
 * Convert SRT content to a VTT string.
 * Normalizes line endings, replaces comma decimal separators with dots,
 * strips sequence numbers, and prepends the WEBVTT header.
 */
export function srtToVtt(srtContent: string): string {
  let vtt = 'WEBVTT\n\n';
  const content = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = content.trim().split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split('\n');
    const tsIndex = lines.findIndex((l) => l.includes('-->'));
    if (tsIndex === -1) continue;
    const timestamp = lines[tsIndex].replace(/,/g, '.');
    const text = lines.slice(tsIndex + 1).join('\n');
    vtt += `${timestamp}\n${text}\n\n`;
  }
  return vtt;
}

/** Parse a VTT timestamp (HH:MM:SS.mmm or MM:SS.mmm) into seconds. */
function parseTimestamp(ts: string): number {
  const parts = ts.trim().split(':');
  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 3) {
    [h, m] = [Number(parts[0]), Number(parts[1])];
    s = Number(parts[2].replace(',', '.'));
  } else if (parts.length === 2) {
    m = Number(parts[0]);
    s = Number(parts[1].replace(',', '.'));
  }
  return h * 3600 + m * 60 + s;
}

/** Format seconds into a VTT timestamp HH:MM:SS.mmm. */
function formatTimestamp(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

/** Parse a VTT string into a cue array. */
export function parseVtt(vttContent: string): SubtitleCue[] {
  const content = vttContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = content.trim().split(/\n\n+/);
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const tsIndex = lines.findIndex((l) => l.includes('-->'));
    if (tsIndex === -1) continue;
    const [startRaw, endRaw] = lines[tsIndex].split('-->');
    cues.push({
      start: parseTimestamp(startRaw),
      end: parseTimestamp(endRaw),
      text: lines.slice(tsIndex + 1).join('\n'),
    });
  }
  return cues;
}

/**
 * Strip ASS/SSA styling tags from a Dialogue line's text field.
 * Removes {\...} override blocks and converts \N / \n to newlines.
 */
function stripAssTags(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, '')
    .replace(/\\N/gi, '\n')
    .trim();
}

/** Parse ASS/SSA content into a cue array (plain text only). */
export function parseAss(assContent: string): SubtitleCue[] {
  const content = assContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = content.split('\n');
  const cues: SubtitleCue[] = [];

  // Locate the [Events] format line to find column positions.
  let formatCols: string[] = [];
  for (const line of lines) {
    if (line.startsWith('Format:') && formatCols.length === 0) {
      formatCols = line
        .slice('Format:'.length)
        .split(',')
        .map((c) => c.trim());
    }
    if (line.startsWith('Dialogue:')) {
      const startIdx = formatCols.indexOf('Start');
      const endIdx = formatCols.indexOf('End');
      const textIdx = formatCols.indexOf('Text');
      if (startIdx === -1 || endIdx === -1 || textIdx === -1) continue;
      // Text is always last and may contain commas, so limit the split.
      const fields = line.slice('Dialogue:'.length).split(',');
      const head = fields.slice(0, textIdx);
      const text = fields.slice(textIdx).join(',');
      cues.push({
        start: parseTimestamp(head[startIdx]),
        end: parseTimestamp(head[endIdx]),
        text: stripAssTags(text),
      });
    }
  }
  return cues;
}

/** Build a VTT string from a cue array (optionally applying a timing offset). */
export function cuesToVtt(cues: SubtitleCue[], offset = 0): string {
  let vtt = 'WEBVTT\n\n';
  for (const cue of cues) {
    const start = formatTimestamp(cue.start + offset);
    const end = formatTimestamp(cue.end + offset);
    vtt += `${start} --> ${end}\n${cue.text}\n\n`;
  }
  return vtt;
}

/**
 * Parse any supported subtitle file into a cue array.
 * Format is detected by file extension.
 */
export async function parseSubtitleFile(file: File): Promise<SubtitleCue[]> {
  const buffer = await file.arrayBuffer();
  // Try UTF-8 first; TextDecoder defaults are lenient.
  const text = new TextDecoder('utf-8').decode(buffer);
  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'srt':
      return parseVtt(srtToVtt(text));
    case 'vtt':
      return parseVtt(text);
    case 'ass':
    case 'ssa':
      return parseAss(text);
    default:
      throw new Error(`Unsupported subtitle format: .${ext}`);
  }
}

/** Derive a human-readable track label from a filename. */
export function labelFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}
