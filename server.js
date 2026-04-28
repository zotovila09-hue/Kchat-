const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (req, res) => {
    res.send('KChat Server is running!');
});

const users = new Map();

// Демо пользователи
users.set('+79991112233', { phone: '+79991112233', name: '🤖 Бот', username: 'bot', avatar: '🤖', online: true });
users.set('+79001234567', { phone: '+79001234567', name: 'Александр', username: 'alex', avatar: '😎', online: true });
users.set('+79161112233', { phone: '+79161112233', name: 'Мария', username: 'maria', avatar: '👩', online: true });
users.set('+79262223344', { phone: '+79262223344', name: 'Дмитрий', username: 'dima', avatar: '👨', online: false });
users.set('+79363334455', { phone: '+79363334455', name: 'Елена', username: 'elena', avatar: '👩', online: true });

io.on('connection', (socket) => {
    console.log('🟢 User connected:', socket.id);

    socket.on('register', (data) => {
        if (!users.has(data.phone)) {
            users.set(data.phone, {
                phone: data.phone,
                name: data.name,
                username: data.username,
                avatar: data.avatar,
                online: true
            });
        }
        socket.phone = data.phone;
        io.emit('users:update', Array.from(users.values()));
        console.log('✅ Registered:', data.username);
    });

    socket.on('user:search', (query) => {
        const q = query.toLowerCase().replace('@', '');
        const results = Array.from(users.values())
            .filter(u => u.phone !== socket.phone)
            .filter(u => u.username?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q));
        socket.emit('user:searchResults', results);
    });

    socket.on('message:send', (data) => {
        io.emit('message:private', {
            chatId: data.chatId,
            fromPhone: socket.phone,
            text: data.text,
            time: Date.now()
        });
    });

    socket.on('disconnect', () => {
        console.log('🔴 User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🚀 KChat Server running on port', PORT);
});
