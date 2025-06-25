let ioInstance = null;
const userSockets = new Map(); // ✅ Directly initialize the Map

export function setIO(io) {
    ioInstance = io;
}

export function getIO() {
    if (!ioInstance) {
        throw new Error('Socket.IO not initialized!');
    }
    return ioInstance;
}

export function getUserSockets() {
    return userSockets;
}
