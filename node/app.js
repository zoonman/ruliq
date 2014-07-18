var express = require('express'), app = express(), http=require('http'), MongoClient = require('mongodb').MongoClient;
var jade = require('jade');


var server = http.createServer(app);
var io = require('socket.io').listen(server);

Array.prototype.strInArray = function(obj) {
	var i = this.length;
	while (i--) {
		if (this[i].toLowerCase() == obj.toLowerCase()) {
			return true;
		}
	}
	return false;
}
function filter_message(text) {
	// check for members names @member
	text = text.replace(/&/g, '&amp;').
     replace(/</g, '&lt;').  
     replace(/>/g, '&gt;'). 
     replace(/"/g, '&quot;').
     replace(/'/g, '&#039;');
  var r = /"/g;
	return text;
}

function ts() {
	return Date.now();
}

var login_blacklist = ['null','admin','root','bot','administrator','linux','windows','mac'];
var members = ['bot'];
var members_data = [];
var messages_data = [];


MongoClient.connect(process.env.MONGODB_CHAT_AUTH, function(err, db) {

var chatLog = db.collection('chatlog'); 

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set("view options", { layout: false });
app.configure(function() {
	app.use(express.static(__dirname + '/public'));
});
app.get('/', function(req, res){
  res.render('home.jade');
});
app.get('/rules.html', function(req, res){
  res.render('rules.jade');
});
app.get('/logs/:year/:month', function(req, res){
	chatLog.find().limit(1000).toArray(function(err,items) {
	 return res.render('logs.jade', {year: req.params.year, month: req.params.month, chatLogs: items} );
	});
});
server.listen(3000, "127.0.0.1");
io.sockets.on('connection', function (socket) {
	socket.on('setPseudo', function (pseudoName) {
		if (members.strInArray(pseudoName) || login_blacklist.strInArray(pseudoName) || ! /^[a-z0-9]+$/i.test(pseudoName) ) {
			socket.emit('command', {'type':'relogin'} );
		}
		else {
			socket.set('pseudo', pseudoName);
			members.push(pseudoName);
			socket.emit('command', {'type':'succefull_login'} );
			var data = { 'message' : 'New user [' + pseudoName + '] connected', pseudo : 'Bot', 'hclass' : 'server', 'ts' : ts() };
			socket.broadcast.emit('message', data);
			socket.emit('members', members);
			socket.broadcast.emit('members', members);
			members_data[pseudoName]={socket_id:socket.id, 'ts' : ts()};
			for (var i in messages_data) {
				socket.emit('message', messages_data[i]);
			}
		}
	});
	socket.on('disconnect', function() {
		socket.get('pseudo', function (error, name) {
			if (name != null && !login_blacklist.strInArray(name)) {
				socket.broadcast.emit('message', { 'message' : 'User [' + name + '] disconnected', pseudo : 'Bot', 'hclass' : 'server', 'ts' : ts() });
				var u_index = members.indexOf(name);
				if (u_index > -1) {
					members.splice(u_index, 1);
				}
				delete members_data[name];
				socket.broadcast.emit('members', members);
			}
			console.log("user " + name + " disconnected ");
		});
	});
	socket.on('message', function (message) {
		socket.get('pseudo', function (error, name) {
			if (name != null && !login_blacklist.strInArray(name)) {
				var pm = false;
				// personal message detection
				if (/^pm\s+@/ig.test(message)) {
					//
					// console.log('Clients:');
					// console.log(members_data);
					var match = /^pm\s+@(\w+)/ig.exec(message);
					console.log(':::::::' + match[1]+':::');
					if (typeof(match[1]) !== "undefined" && typeof(members_data[match[1]]) !== "undefined") {
						pm = true;
						socket.emit('message', { 'message' : filter_message(message), 'pseudo' : name, 'hclass' : 'pm', 'ts' : ts() } );
						io.sockets.socket(members_data[match[1]].socket_id).emit('message', {'message':filter_message(message.replace(/^pm\s+@(\w+)/ig, '')),'pseudo':name,'hclass':'pm', 'ts' : ts()});
					}
					if (typeof(match[1]) !== "undefined" && match[1] === "bot") { 
							// heh :D
							var data = { 'message' : 'Привет, о лучезарный ' + name + '! Я спал многие века ожидая твоего сообщения. Теперь ты меня разбудил. Спасибо друг мой. Но что-то я снова устал. Пойду посплю еще. ', pseudo : 'Bot', 'hclass' : 'server', 'ts' : ts() };
							socket.emit('message', data);
						}
					// io.sockets.sockets(socketid).emit('message', 'for your eyes only');
				}
				// console.log('::' + message.substr(0, 3) + '::');
				
				
				if (! pm) {
					var filtered_message = filter_message(message);
					var latest_message = '';
					var response_type = 0;
					var current_ts = ts();
					for (i = messages_data.length-1; i >= 0; i--) {
						if (name  == messages_data[i]['pseudo']) {
							if (current_ts - messages_data[i]['ts'] < 3000) {
								response_type = 1; // too fast
								break;
							}
							if (filtered_message == messages_data[i]['message']) {
								response_type = 2; // repeats
								break;
							}
							break;
						}
					}
					var data = { 'message' : filtered_message, 'pseudo' : name, 'hclass' : 'regular', 'ts' : ts() };
					switch(response_type) {
						case 1:
							data = { 'message' : 'Попридержи коней! Куда мчишь?', 'pseudo' : 'Bot', 'hclass' : 'server', 'ts' : ts() };
							socket.emit('message', data);
						break;
						case 2:
							data = { 'message' : 'А не пора ли нам отведать чего-нибудь литературного?', 'pseudo' : 'Bot', 'hclass' : 'server', 'ts' : ts() };
							socket.emit('message', data);
						break;
						default:
							messages_data.push(data);
							chatLog.insert(data, function(err, result){
								"use strict";
								if (!err) {
									console.log(result);} else {console.log(err);}
							});
							if (messages_data.length > 50) {
								messages_data = messages_data.slice(-50);
							}
							socket.emit('message', data);
							socket.broadcast.emit('message', data);
					}
					
				}
				
			}
			else {
				socket.emit('command', {'type':'relogin', 'ts' : ts()} );
			}
			console.log("user " + name + " send this : " + message);
		})
	});
});

});

