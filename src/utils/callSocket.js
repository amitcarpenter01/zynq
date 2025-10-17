const onlineUsers = new Map();

function initializeCallSocket(io) {
    io.on("connection", (socket) => {
        console.log("User connected to call new socket:", socket.id);

        socket.on("register", (userId) => {
            console.log(`User ${userId} registered with socket ${socket.id}`);
            onlineUsers.set(userId.toString(), socket.id);
        });

        socket.on("disconnect", () => {
            for (const [userId, id] of onlineUsers.entries()) {
                if (id === socket.id) {
                    onlineUsers.delete(userId);
                    break;
                }
            }
            console.log("User disconnected:", socket.id);
        });
    });
}

export default initializeCallSocket;
export { onlineUsers };