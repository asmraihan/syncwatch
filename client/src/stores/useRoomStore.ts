import { create } from 'zustand';
import type { ChatMessage, RoomUser } from '../types';

interface RoomState {
  roomCode: string;
  username: string;
  color: string;
  userId: string;
  users: RoomUser[];
  hostId: string | null;
  messages: ChatMessage[];
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'error';

  // actions
  setIdentity: (data: {
    roomCode: string;
    username: string;
    color: string;
    userId: string;
  }) => void;
  setUsers: (users: RoomUser[]) => void;
  setHostId: (hostId: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  setConnectionStatus: (status: RoomState['connectionStatus']) => void;
  isHost: () => boolean;
  reset: () => void;
}

const initialState = {
  roomCode: '',
  username: '',
  color: '',
  userId: '',
  users: [] as RoomUser[],
  hostId: null as string | null,
  messages: [] as ChatMessage[],
  connectionStatus: 'connecting' as RoomState['connectionStatus'],
};

export const useRoomStore = create<RoomState>((set, get) => ({
  ...initialState,

  setIdentity: (data) => set(data),
  setUsers: (users) => set({ users }),
  setHostId: (hostId) => set({ hostId }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  isHost: () => get().hostId === get().userId,
  reset: () => set(initialState),
}));
