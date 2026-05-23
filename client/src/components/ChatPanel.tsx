import { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '../stores/useRoomStore';
import { useWebSocketSend } from '../contexts/WebSocketContext';
import ChatMessageItem from './ChatMessage';

/** Chat / activity sidebar: message list + input. */
export default function ChatPanel() {
  const messages = useRoomStore((s) => s.messages);
  const [draft, setDraft] = useState('');
  const { send } = useWebSocketSend();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom whenever a new message arrives.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const content = draft.trim();
    if (!content) return;
    send({ type: 'chat', content });
    setDraft('');
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted">No messages yet.</p>
        ) : (
          messages.map((m) => <ChatMessageItem key={m.id} message={m} />)
        )}
      </div>
      <div className="flex gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={500}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
