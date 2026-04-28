const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.get('/', (req, res) => {
    res.send('KChat Server is running!');
});

// Хранилище пользователей
const users = new Map();

// Демо пользователи
const demoUsers = [
    { phone: '+79991112233', name: '🤖 Бот', username: 'bot', avatar: '🤖', online: true },
    { phone: '+79001234567', name: 'Александр', username: 'alex', avatar: '😎', online: false },
    { phone: '+79161112233', name: 'Мария', username: 'maria', avatar: '👩', online: false },
    { phone: '+79262223344', name: 'Дмитрий', username: 'dima', avatar: '👨', online: false },
    { phone: '+79363334455', name: 'Елена', username: 'elena', avatar: '👩', online: false },
];

demoUsers.forEach(u => users.set(u.phone, u));

io.on('connection', (socket) => {
    console.log('🟢 Подключился:', socket.id);

    // Регистрация
    socket.on('register', (data) => {
        const { phone, name, username, avatar } = data;
        users.set(phone, { phone, name, username, avatar, online: true, socketId: socket.id });
        socket.phone = phone;

        const allUsers = Array.from(users.values()).map(u => ({
            phone: u.phone, name: u.name, username: u.username,
            avatar: u.avatar, online: u.online
        }));
        io.emit('users:update', allUsers);
        console.log(`✅ ${name} (@${username}) зарегистрирован`);
    });

    // Поиск пользователей
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

    // Личное сообщение
    socket.on('message:send', (data) => {
        console.log(`📩 Сообщение → ${data.to}: ${data.text}`);
        const receiver = users.get(data.to);
        if (receiver && receiver.socketId) {
            io.to(receiver.socketId).emit('message:private', {
                chatId: data.chatId,
                fromPhone: data.fromPhone,
                fromName: data.fromName,
                fromUsername: data.fromUsername,
                text: data.text,
                time: Date.now()
            });
            console.log(`✅ Доставлено: @${receiver.username}`);
        } else {
            console.log(`❌ Пользователь ${data.to} не в сети`);
        }
    });

    // Общий чат
    socket.on('message:general', (data) => {
        console.log(`🌍 Общий чат: ${data.fromName}: ${data.text}`);
        socket.broadcast.emit('message:general', {
            fromPhone: data.fromPhone,
            fromName: data.fromName,
            fromUsername: data.fromUsername,
            text: data.text,
            time: Date.now()
        });
    });

    // Отключение
    socket.on('disconnect', () => {
        const user = users.get(socket.phone);
        if (user) {
            user.online = false;
            user.socketId = null;
            const allUsers = Array.from(users.values()).map(u => ({
                phone: u.phone, name: u.name, username: u.username,
                avatar: u.avatar, online: u.online
            }));
            io.emit('users:update', allUsers);
            console.log(`🔴 ${user.name} отключился`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log('👥 Пользователи: bot, alex, maria, dima, elena');
});
