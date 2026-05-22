import type { ChatMessage } from '../types';
import { formatTime } from '../utils/formatTime';

interface ChatMessageProps {
  message: ChatMessage;
}

/** Renders a single chat message — user or system styled. */
export default function ChatMessageItem({ message }: ChatMessageProps) {
  const time = new Date(message.timestamp);
  const clock = `${String(time.getHours()).padStart(2, '0')}:${String(
    time.getMinutes(),
  ).padStart(2, '0')}`;
  void formatTime;

  if (message.type === 'system') {
    return (
      <p className="text-xs italic text-text-muted">{message.content}</p>
    );
  }

  return (
    <div className="text-sm">
      <span className="font-medium" style={{ color: message.color }}>
        {message.username}
      </span>
      <span className="ml-2 text-xs text-text-muted">{clock}</span>
      <p className="text-text-primary">{message.content}</p>
    </div>
  );
}
