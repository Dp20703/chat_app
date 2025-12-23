const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true
    },
    senderId: {
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "User",
        type: String,
        required: true
    },

    senderUsername: {
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "User",
        type: String,
        // required: true
    },
    receiverId: {
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "User",
        type: String,
        // required: true
    },

    recieverUsername: {
        // type: mongoose.Schema.Types.ObjectId,
        // ref: "User",
        type: String,
        // required: true
    },

    text: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    },

    // 🔥 Auto-delete field (24 hours)
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 12 * 60 * 60 * 1000)
    }

}, { timestamps: true });


// 🔥 TTL index → MongoDB deletes automatically
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Message", messageSchema);
