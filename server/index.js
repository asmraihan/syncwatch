// index.js — Express static server + WebSocket sync relay.

const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const {
  joinRoom,
  leaveRoom,
  broadcast,
  getRoom,
  publicUsers,
  cleanupRooms,
} = require('./rooms');

const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);

// 1MB payload cap — enough for parsed subtitle cue arrays.
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 1024 });

// --- Static React build (production) ---
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// SPA fallback — every non-asset route serves index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('SyncWatch server running. Build the client first.');
  });
});

// --- WebSocket handling ---
wss.on('connection', (ws) => {
  // Per-connection identity. `join` may override `id` with a client-generated
  // UUID so reconnects keep the same identity within a session.
  ws.id = crypto.randomUUID();
  ws.roomCode = null;
  ws.username = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames
    }
    handleMessage(ws, msg);
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = leaveRoom(ws.roomCode, ws.id);
    if (room) {
      broadcast(ws.roomCode, {
        type: 'user_left',
        userId: ws.id,
        username: ws.username,
        userCount: room.users.length,
        newHostId: room.hostId,
        users: publicUsers(room),
      });
    }
  });
});

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'join': {
      // Room codes are case-insensitive.
      const code = String(msg.roomCode || '').toLowerCase();
      if (msg.userId) ws.id = String(msg.userId);
      const user = {
        id: ws.id,
        username: msg.username,
        color: msg.color,
        ws,
      };
      ws.roomCode = code;
      ws.username = msg.username;
      const room = joinRoom(code, user);

      // Send current room state to the joiner. `selfId` lets the client
      // identify itself in the users list.
      ws.send(
        JSON.stringify({
          type: 'room_state',
          selfId: ws.id,
          users: publicUsers(room),
          hostId: room.hostId,
        }),
      );
      // Notify everyone else with the updated full user list.
      broadcast(
        code,
        {
          type: 'user_joined',
          userId: user.id,
          username: user.username,
          color: user.color,
          userCount: room.users.length,
          isHost: room.hostId === user.id,
          users: publicUsers(room),
        },
        ws.id,
      );
      break;
    }

    case 'chat': {
      if (!ws.roomCode) return;
      broadcast(ws.roomCode, {
        type: 'chat',
        username: ws.username,
        color: getUserColor(ws),
        content: String(msg.content || '').slice(0, 1000),
        timestamp: Date.now(),
      });
      break;
    }

    case 'sync': {
      if (!ws.roomCode) return;
      broadcast(
        ws.roomCode,
        {
          type: 'sync',
          action: msg.action,
          timestamp: msg.timestamp,
          wallClock: msg.wallClock,
          username: ws.username,
        },
        ws.id,
      );
      break;
    }

    case 'heartbeat': {
      if (!ws.roomCode) return;
      broadcast(
        ws.roomCode,
        {
          type: 'heartbeat',
          timestamp: msg.timestamp,
          wallClock: msg.wallClock,
          playbackState: msg.playbackState,
        },
        ws.id,
      );
      break;
    }

    case 'buffer_start':
    case 'buffer_end': {
      if (!ws.roomCode) return;
      broadcast(
        ws.roomCode,
        { type: msg.type, username: ws.username },
        ws.id,
      );
      break;
    }

    case 'subtitle_share': {
      if (!ws.roomCode) return;
      // Relayed to ALL users, including the sender, as confirmation.
      broadcast(ws.roomCode, {
        type: 'subtitle_share',
        label: msg.label,
        cues: msg.cues,
        username: ws.username,
      });
      break;
    }

    case 'subtitle_select': {
      if (!ws.roomCode) return;
      // Relay to OTHER peers — the sender already applied locally.
      broadcast(
        ws.roomCode,
        {
          type: 'subtitle_select',
          label: msg.label,
          username: ws.username,
        },
        ws.id,
      );
      break;
    }

    case 'file_info': {
      if (!ws.roomCode) return;
      broadcast(ws.roomCode, {
        type: 'file_info',
        username: ws.username,
        name: msg.name,
        size: msg.size,
        fingerprint: msg.fingerprint,
      });
      break;
    }

    case 'ping': {
      ws.send(
        JSON.stringify({
          type: 'pong',
          clientTime: msg.clientTime,
          serverTime: Date.now(),
        }),
      );
      break;
    }

    default:
      // Unknown message type — ignore.
      break;
  }
}

/** Look up a user's assigned color within their room. */
function getUserColor(ws) {
  const room = getRoom(ws.roomCode);
  const user = room?.users.find((u) => u.id === ws.id);
  return user?.color || '#6366f1';
}

// Periodic room cleanup.
setInterval(cleanupRooms, 60 * 1000);

server.listen(PORT, () => {
  console.log(`SyncWatch server listening on http://localhost:${PORT}`);
});
