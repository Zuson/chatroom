function divEscapedContentElement (message) {
	return $('<div></div>').text(message);
}
function divSystemContentElement (message) {
	return $('<div></div>').html('<i>' + message + '</i>');
}

function processUserInput (chatApp, socket) {
	var message = $('#send-message').val();
	var systemMessage;
	if(message.charAt(0) == '/') {
		systemMessage = chatApp.processCommand(message);
		if(systemMessage) {
			$('#messages').append(divSystemContentElement(systemMessage));
		}
	}else{
		chatApp.sendMessage($('#room').text(), message);
		$('#messages').append(divEscapedContentElement(message));
		$('#messages').scrollTop($('#messages').prop('scrollHeight'));
	}
	$('#send-message').val('');
}

var socket = io.connect();
$(document).ready(function () {
	var chatApp = new Chat(socket);

	// 获取初始用户名
	socket.on('nameResult', function(result) {
		var message;
		if(result.success) {
			message = '你现在的用户名是： ' + result.name + '.';
		}else{
			message = result.message;
		}
		$('#messages').append(divSystemContentElement(message));
	});

	// 侦听
	socket.on('joinResult', function(result) {
		$('#room').text(result.room);
		$('#message').append(divSystemContentElement('Room changed'));
	});

	// 侦听广播信息
	socket.on('message', function(message) {
		var newElement = $('<div></div>').text(message.text);
		$('#messages').append(newElement);
	});

	// 侦听房间列表信息
	socket.on('rooms', function(rooms) {
		$('#room-list').empty();
		for(var room in rooms){
			if(room != '') {
				$('#room-list').append(divEscapedContentElement(rooms[room]));
			}
		}
		$('#room-list div').click(function() {
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();
		});
	});

	setInterval(function() {
		socket.emit('rooms');
	}, 1000);

	$('#send-message').focus();
	$('#send-form').submit(function() {
		processUserInput(chatApp, socket);
		return false;
	});
});



