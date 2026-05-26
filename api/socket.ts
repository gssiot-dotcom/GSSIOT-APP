import { io } from 'socket.io-client'

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_BASE_URL

export type NodeType = 'node' | 'angle' | 'vertical'

export const socket = io(SOCKET_URL, {
	path: '/socket.io/',
	transports: ['websocket', 'polling'],
	autoConnect: false,
	reconnection: true,
})

export const ensureSocketConnected = () => {
	if (!socket.connected) {
		socket.connect()
	}
}
