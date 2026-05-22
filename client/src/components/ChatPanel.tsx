import { useState } from 'react';
import { useRoomStore } from '../stores/useRoomStore';
import ChatMessageItem from './ChatMessage';

/** Chat / activity sidebar: message list + input. */
export default function ChatPanel() {
  const messages = useRoomStore((s) => s.messages);
  const [draft, setDraft] = useState('');

  const send = () => {
    const content = draft.trim();
    if (!content) return;
    // TODO(chat phase): emit chat message over WebSocket.
    setDraft('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
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
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-border bg-bg-tertiary px-3 py-2 text-sm placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          onClick={send}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Send
        </button>
      </div>
    </div>
  );
}
