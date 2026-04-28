const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// ====== БАЗА ПОЛЬЗОВАТЕЛЕЙ ======
const users = new Map(); // phone -> { phone, name, username, avatar, online }

// Демо пользователи
users.set('+79991112233', { phone: '+79991112233', name: '🤖 Бот', username: 'bot', avatar: '🤖', online: true });
users.set('+79001234567', { phone: '+79001234567', name: 'Александр', username: 'alex', avatar: '😎', online: true });
users.set('+79161112233', { phone: '+79161112233', name: 'Мария', username: 'maria', avatar: '👩', online: true });
users.set('+79262223344', { phone: '+79262223344', name: 'Дмитрий', username: 'dima', avatar: '👨', online: false });
users.set('+79363334455', { phone: '+79363334455', name: 'Елена', username: 'elena', avatar: '👩', online: true });

io.on('connection', (socket) => {
    console.log('🟢 Подключился:', socket.id);

    // ====== РЕГИСТРАЦИЯ ======
    socket.on('register', (data) => {
        const { phone, name, username, avatar } = data;
        
        // Проверяем уникальность username
        const exist = Array.from(users.values()).find(u => u.username === username && u.phone !== phone);
        if (exist) {
            socket.emit('register:error', 'Username занят');
            return;
        }

        users.set(phone, { phone, name, username, avatar, online: true, socketId: socket.id });
        socket.phone = phone;
        
        // Отправляем обновлённый список всем
        io.emit('users:update', Array.from(users.values()).map(u => ({
            phone: u.phone, name: u.name, username: u.username,
            avatar: u.avatar, online: u.online
        })));

        socket.emit('register:success', { phone, name, username, avatar });
        socket.broadcast.emit('user:online', { phone, name, username, avatar });
        
        console.log(`✅ Зарегистрирован: @${username} (${name})`);
    });

    // ====== ПОИСК ПОЛЬЗОВАТЕЛЕЙ ======
    socket.on('user:search', (query) => {
        const q = query.toLowerCase().replace('@', '');
        const results = Array.from(users.values())
            .filter(u => u.phone !== socket.phone)
            .filter(u => u.username?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q))
            .map(u => ({
                phone: u.phone, name: u.name, username: u.username,
                avatar: u.avatar, online: u.online
            }));
        
        socket.emit('user:searchResults', results);
        console.log(`🔍 Поиск "${query}": найдено ${results.length}`);
    });

    // ====== ОТПРАВКА СООБЩЕНИЯ ======
    socket.on('message:send', (data) => {
        const sender = users.get(socket.phone);
        const receiver = users.get(data.to);
        
        if (receiver && receiver.socketId) {
            io.to(receiver.socketId).emit('message:private', {
                chatId: data.chatId,
                fromPhone: socket.phone,
                fromName: sender?.name,
                fromUsername: sender?.username,
                text: data.text,
                time: Date.now()
            });
            console.log(`📩 Сообщение от @${sender?.username} -> @${receiver?.username}`);
        }
    });

    // ====== ОТКЛЮЧЕНИЕ ======
    socket.on('disconnect', () => {
        const user = users.get(socket.phone);
        if (user) {
            user.online = false;
            user.socketId = null;
            io.emit('user:offline', { phone: socket.phone });
            console.log(`🔴 Отключился: @${user.username}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
