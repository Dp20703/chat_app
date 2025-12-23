const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { login, register } = require("./auth/jwt")
const path = require("path")
const cors = require("cors");

require("dotenv").config();
require("./db"); // MongoDB connect

const app = express();
app.use(cors());
app.use(express.static(path.resolve("./public")))
app.use(express.json());
const server = http.createServer(app);

// HTTP routes
app.get("/", (req, res) => {
    res.redirect("/chat.html");
})
app.get("/login", (req, res) => {
    res.redirect("/login.html");
});
app.get("/register", (req, res) => {
    res.redirect("/register.html");
});

app.post("/login", login);
app.post("/register", register);


// create socket server
const io = new Server(server, {
    origin: "https://chat-app-mauve-alpha-93.vercel.app/",
    methods: ["GET", "POST"]
});

// socket logic lives elsewhere
require("./socket")(io);


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
