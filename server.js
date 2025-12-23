const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { login, register } = require("./auth/jwt")
const path = require("path")

require("dotenv").config();


require("./db"); // MongoDB connect

const app = express();
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
    cors: { origin: "*" }
});

// socket logic lives elsewhere
require("./socket")(io);

server.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});
