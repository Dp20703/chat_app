const Message = require("./models/message");
require("dotenv").config();
const jwt = require("jsonwebtoken")

function generateChatId(userA, userB) {
    return [userA, userB].sort().join("_");
}


module.exports = function (io) {
    /* 🔐 SOCKET AUTH MIDDLEWARE */
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Unauthorized"));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = {
                id: decoded.userId,
                username: decoded.username
            };
            next();
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return next(new Error("Token expired"));
            }
            return next(new Error("Invalid token"));
        }

    });

    // userSocketMap
    const userSocketMap = new Map(); // userId ->socket.id
    const onlineUsers = new Map(); // username → Set of socket ids (supports multiple tabs)

    io.on("connection", (socket) => {

        console.log("🟢 User Connected ", socket.user);

        userSocketMap.set(socket.user.id, socket.id);
        console.log("UserSoketMap: ", userSocketMap);

        const username = socket.user.username;
        // add socket to user
        if (!onlineUsers.has(username)) {
            onlineUsers.set(username, new Set());
        }
        onlineUsers.get(username).add(socket.id);

        // send username
        socket.emit("username", socket.user.username);

        // send online users list
        // socket.broadcast.emit("userOnline", Array.from(onlineUsers.keys()));
        io.emit("userOnline", Array.from(onlineUsers.keys()));
        console.log("Online Users:", onlineUsers);




        // private message from onlinelist
        socket.on("privateMessage", async ({ toUsername, text }, ack) => {
            try {
                // same username validation
                if (toUsername == socket.user.username) {
                    return ack({ error: "Cannot message yourself" });
                };

                // generate ChatId
                const chatId = generateChatId(socket.user.username, toUsername);

                // store message
                const message = await Message.create({
                    chatId,
                    senderId: socket.user.id,
                    senderUsername: socket.user.username,
                    receiverUsername: toUsername,
                    text
                })

                // if receiver online → deliver
                const receiverSockets = onlineUsers.get(toUsername);
                // console.log("receiverSockets ", receiverSockets);

                if (receiverSockets) {
                    // console.log("Receiver socketIds ", receiverSockets);
                    message.status = "delivered";
                    await message.save(); // save to DB

                    // send to ALL active tabs of receiver
                    receiverSockets.forEach(socketId => {
                        io.to(socketId).emit("privateMessage", { message });
                    });
                }
                // ✓ delivered or sent
                ack({
                    messageId: message._id,
                    status: message.status,
                });
            } catch (err) {
                console.error(err);
                ack({ error: "Message failed" });
            }
        }

        )

        // Group Chat: 
        socket.on("sendMessage", async ({ text }, ack) => {
            const senderId = socket.user.id;

            //chatId
            const chatId = generateChatId("group_chat", socket.user.username);
            // store message
            const message = await Message.create({
                chatId,
                senderId,
                // receiverId: toUserId,
                text
            })
            message.status = "delivered";
            await message.save();
            socket.broadcast.emit("receiveMessage", message);

            // if receiver online → deliver
            // const targetSocketId = userSocketMap.get(toUserId);
            // if (targetSocketId) {
            //     message.status = "delivered";
            //     await message.save();
            //     io.to(targetSocketId).emit("receiveMessage", message);
            // }
            // ✓ delivered or sent
            ack({
                messageId: message._id,
                status: message.status
            });

        })

        // Show typing
        socket.on("typing", (user) => {
            socket.broadcast.emit("user-typing", user);
        })

        socket.on("stop-typing", (user) => {
            socket.broadcast.emit("user-stop-typing", user);
        })

        // Disconnect
        socket.on("disconnect", () => {
            const username = socket.user.username;

            if (!username) return;

            const sockets = onlineUsers.get(username);
            if (!sockets) return;

            sockets.delete(socket.id);

            // remove user only if no active sockets left
            if (sockets.size === 0) {
                onlineUsers.delete(username);
                io.emit("userOnline", Array.from(onlineUsers.keys()));
                userSocketMap.delete(socket.user.id);
            }
            console.log("❌ User disconnected ", socket.id);
        });
    })
}