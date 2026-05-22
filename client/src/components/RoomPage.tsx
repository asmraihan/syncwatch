import { useParams } from 'react-router-dom';
import RoomHeader from './RoomHeader';
import VideoPlayer from './VideoPlayer';
import ChatPanel from './ChatPanel';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const roomCode = (code ?? '').toLowerCase();

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <RoomHeader roomCode={roomCode} />

      {/* Two-panel layout: video (70%) + chat (30%) on desktop, stacked on mobile */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <main className="flex flex-1 items-center justify-center bg-black md:basis-[70%]">
          <VideoPlayer />
        </main>
        <aside className="flex min-h-0 basis-[40%] flex-col border-t border-border bg-bg-secondary md:basis-[30%] md:border-l md:border-t-0">
          <ChatPanel />
        </aside>
      </div>
    </div>
  );
}
