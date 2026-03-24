// src/services/socket.ts
import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin; // O proxy do Vite redirecionará para o backend

export const socket = io(SOCKET_URL, {
  path: '/socket.io',
  transports: ['websocket'],
});

socket.on('connect', () => {
    console.log('🔌 Socket.io conectado ao KINGSTAR Core');
});
