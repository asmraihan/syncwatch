# SyncWatch

Watch local videos together, perfectly in sync. Each participant loads their
own local video file — **no video data ever travels over the network**, only
tiny WebSocket control messages. Subtitles uploaded by one user are shared with
the whole room and cached in IndexedDB.

## Tech stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Server       | Node.js + Express + `ws`            |
| Client       | React 18 + TypeScript + Vite        |
| State        | Zustand                             |
| Styling      | Tailwind CSS (dark theme)           |
| Storage      | IndexedDB (via `idb`)               |

## Project structure

```
syncwatch/
├── server/          # Express static server + WebSocket sync relay
│   ├── index.js
│   ├── rooms.js
│   └── package.json
├── client/          # React + TypeScript + Vite app
│   └── src/
│       ├── stores/      # Zustand stores (room, player)
│       ├── hooks/       # useWebSocket, useSync, useSubtitles
│       ├── components/  # UI components
│       ├── utils/       # subtitle parser, name generator, db, formatTime
│       └── types/       # shared TypeScript types
├── Dockerfile
├── docker-compose.yml
└── SYNCWATCH_BUILD_GUIDE.md   # full feature specification
```

## Development

Run the server and client in two terminals:

```bash
# Terminal 1 — WebSocket server on :3001
cd server && npm install && npm run dev

# Terminal 2 — Vite dev server on :5173 (proxies /ws to :3001)
cd client && npm install && npm run dev
```

Open http://localhost:5173.

## Production build

```bash
cd client && npm install && npm run build   # outputs client/dist/
cd server && npm install && npm start       # serves client/dist + WebSocket on :3001
```

Open http://localhost:3001.

## Docker

```bash
docker compose up --build
```

## Build status

The project is **scaffolded** — folder structure, configuration, and the
WebSocket server are in place. Feature implementation follows the order in
[SYNCWATCH_BUILD_GUIDE.md](SYNCWATCH_BUILD_GUIDE.md) §14:

- [x] Server — Express + ws + room manager
- [x] Landing page — Create/Join UI with routing
- [x] Room page layout — two-panel skeleton with header
- [ ] WebSocket hook — connect, join, message handling
- [ ] File drop zone — load local video (basic UI in place)
- [ ] Basic sync — play/pause/seek events
- [ ] Custom player controls — seekbar, buttons, volume, fullscreen
- [ ] Chat — send/receive, system messages (UI in place)
- [ ] Drift correction — heartbeat system
- [ ] Subtitle system — upload, parse, share, IndexedDB (parser + db ready)
- [ ] Buffer handling
- [ ] Polish — toasts, animations, shortcuts, responsive
- [ ] Docker verification
