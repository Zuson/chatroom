var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
	io = socketio.listen(server);
	io.set('log level', 0);
	io.sockets.on('connection', function (socket) {
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
		joinRoom(socket, '房间1');
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);
		socket.on('rooms', function () {
			// socket.emit('rooms', io.sockets.adapter);
			var aa=io.sockets.adapter.rooms;
			var vv=[]
			for(var i in aa){
				if(!aa[i].hasOwnProperty(i)){
					vv.push(i);
				}
			}
			socket.emit('rooms', vv);
		});
		handleClientDisconnection(socket, nickNames, namesUsed);
	});
};

// 自动分配用户名称
function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = '用户' + guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

// 加入房间
function joinRoom (socket, room) {
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' 刚刚加入 ' + room + '.'
	});

	var usersInRoom =io.sockets.adapter.rooms;
	var usersInRoomSummary = ' 你在' + room +   '用户有: ';
	for(var i in usersInRoom){
		if(currentRoom[i] == currentRoom[socket.id]){
			usersInRoomSummary += nickNames[i];
			usersInRoomSummary +=",";
		}
	}
	usersInRoomSummary=usersInRoomSummary.substring(1,usersInRoomSummary.length-1);
	usersInRoomSummary += '.';
	socket.emit('message', { text: usersInRoomSummary });

	// if (usersInRoom.length > 1) {
	// 	var usersInRoomSummary = 'Users currently in ' + room + ': ';
	// 	for (var index in usersInRoom) {
	// 		var userSocketId = usersInRoom[index].id;
	// 		if (userSocketId != socket.id) {
	// 			if (index > 0){
	// 				usersInRoomSummary += ', ';
	// 			}
	// 			usersInRoomSummary += nickNames[userSocketId];
	// 		}
	// 	}
	// 	usersInRoomSummary += '.';
	// 	socket.emit('message', {text: usersInRoomSummary});
	// }
}

// 尝试改名
function handleNameChangAttempts (socket, nickNames, namesUsed) {
	socket.on('nameAttempt', function(name) {
		if(name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Name cannot begin with "Guset".'
			});
		}else{
			if(namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult', {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' 名称改为 ' + name + '.'
				});
			}else{
				socket.emit('nameResult',{
					success: false,
					message: '这个名称已经被使用.'
				});
			}
		}
	});
}

function handleMessageBroadcasting (socket) {
	socket.on('message', function (message) {
		console.log(nickNames[socket.id])
		console.log(message)
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}

// 加入新的房间
function handleRoomJoining (socket) {
	socket.on('join', function (room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

// 断开 socket.io 服务
function handleClientDisconnection (socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}

