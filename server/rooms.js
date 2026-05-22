// rooms.js — in-memory room state manager.

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} color
 * @property {import('ws').WebSocket} ws
 *
 * @typedef {Object} Room
 * @property {string} code
 * @property {User[]} users
 * @property {string|null} hostId
 * @property {number} createdAt
 * @property {number} lastActivity
 */

function createRoom(code) {
  /** @type {Room} */
  const room = {
    code,
    users: [],
    hostId: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code);
}

/** Add a user to a room, creating the room if it doesn't exist. */
function joinRoom(code, user) {
  let room = rooms.get(code);
  if (!room) room = createRoom(code);
  room.users.push(user);
  if (!room.hostId) room.hostId = user.id;
  room.lastActivity = Date.now();
  return room;
}

/**
 * Remove a user from a room. Transfers host if needed and deletes empty rooms.
 * @returns {Room|undefined} the room (may be empty/deleted)
 */
function leaveRoom(code, userId) {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.users = room.users.filter((u) => u.id !== userId);

  // Transfer host to the next user in join order.
  if (room.hostId === userId) {
    room.hostId = room.users.length > 0 ? room.users[0].id : null;
  }

  if (room.users.length === 0) {
    rooms.delete(code);
  } else {
    room.lastActivity = Date.now();
  }
  return room;
}

/** Send a JSON message to every user in a room, optionally excluding one. */
function broadcast(code, message, excludeId) {
  const room = rooms.get(code);
  if (!room) return;
  const data = JSON.stringify(message);
  room.lastActivity = Date.now();
  for (const user of room.users) {
    if (user.id !== excludeId && user.ws.readyState === 1 /* OPEN */) {
      user.ws.send(data);
    }
  }
}

/** Public, ws-free view of a room's users. */
function publicUsers(room) {
  return room.users.map((u) => ({
    id: u.id,
    username: u.username,
    color: u.color,
    isHost: u.id === room.hostId,
  }));
}

/** Periodic cleanup: drop empty rooms and rooms idle for over 24h. */
function cleanupRooms() {
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.users.length === 0 || now - room.lastActivity > DAY) {
      rooms.delete(code);
    }
  }
}

module.exports = {
  rooms,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  broadcast,
  publicUsers,
  cleanupRooms,
};
