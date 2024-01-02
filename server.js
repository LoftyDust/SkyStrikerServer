
// 引入所需模块
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
let isGameOver = false;
let rooms = [];
let enemies = [null, null, null];
let timer = [0, 0, 0];
let enemyDestroyConfirm = [0, 0, 0];
let roomId;
let dx = [Math.floor(Math.random() * 3) - 1, Math.floor(Math.random() * 3) - 1, Math.floor(Math.random() * 3) - 1];
// 当有客户端连接时触发
io.on('connection', function (socket) {
    console.log('a user connected');
    // 当用户加入游戏时，分配到一个房间
    socket.joinRoom = () => {
        let room;
        for (room in rooms) {
            if (rooms[room].length < 2) {
                rooms[room].push(socket);
                return room;
            }
        }
        room = Object.keys(rooms).length;
        rooms[room] = [socket];
        return room;
    };

    // 玩家加入房间
    roomId = socket.joinRoom();
    console.log(roomId);
    socket.on('join-room', (callback) => {
        socket.join(roomId);
        console.log(socket.id + "加入连接");
        callback(roomId);
    });
    console.log("在线人数：" + rooms[roomId].length);
    if (rooms[roomId].length == 2) {
        //console.log("生成敌人中……");
        isGameOver = false;
        io.emit("game-start");
        createAndBroadcastEnemies();
    }
    // 监听玩家移动事件
    socket.on('player-move', (data) => {
        //console.log(data);
        io.emit('opponent-move', data); // 向同一房间内的其他玩家广播对手移动信息
    });

    // 监听敌人销毁事件
    socket.on('enemy-destroyed', (enemyId) => {
        //生成新敌人代替已消灭的敌人
        let randX = Math.floor(Math.random() * 417);
        let randY = -80;
        let enemy = { id: enemyId, x: randX, y: randY };
        enemies[enemyId] = enemy;
        io.emit('enemy-added', enemy);


    });
    socket.on('disconnect', () => {
        // 用户离开时从房间移除并通知其他用户
        console.log(socket.id + "断开连接")
        enemies = [null, null, null];
        for (let room in rooms) {
            let index = rooms[room].indexOf(socket);
            if (index > -1) {
                rooms[room].splice(index, 1);
                io.emit('opponent-disconnect');
                isGameOver = true;
                // 如果房间为空，则删除整个房间
                if (rooms[room].length === 0) {
                    delete rooms[room];
                }
                break;
            }
        }
    });
});

// 启动服务器监听指定端口
http.listen(3000, function () {
    console.log('listening on *:3000');
});

createAndBroadcastEnemies = () => {
    for (let i = 0; i < 3; i++) {
        let randX = Math.floor(Math.random() * 417);
        let randY = -80;
        let enemy = { id: i, x: randX, y: randY };
        enemies[enemy.id] = enemy;
        io.emit('enemy-added', enemy);
    }
    setInterval(() => {
        if (isGameOver) {
            return;
        }
        updatePosition();
    }, 1000 / 60); // 每秒60帧更新
};
updatePosition = () => {
    if (isGameOver) {
        return;
    }
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
        if (enemies[i] == null) {
            continue;
        }
        if (now - timer[i] >= Math.random() * 3000 + 1000) {
            dx[i] = Math.floor(Math.random() * 3) - 1;
            timer[i] = now;
        }
        if (enemies[i].x + dx[i] < 0 || enemies[i].x + dx[i] > 416) {
            dx[i] = -dx[i];
        }
        enemies[i].x += dx[i];
        enemies[i].y++;
        //console.log(enemies[i]);
        if (enemies[i].y > 848) {
            isGameOver = true;
            io.emit('gameover', true);
            return;
        }
        io.emit('enemy-update', enemies[i]);
    }
};
