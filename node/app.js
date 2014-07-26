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
};

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
var offensive_words = [];

function isOffensive(message) {
  var retVal = false;
  offensive_words.forEach(function(ow){
    if (ow.hasOwnProperty('re')) {
      if (ow.re.test(message)) {
        retVal =  true;
      }
    }
  });
  return retVal;
}

MongoClient.connect(process.env.MONGODB_CHAT_AUTH, function(err, db) {

  var chatLog = db.collection('chatlog');

  db.collection('offensive').find().toArray(function(err, items) {
    items.forEach(function(val) {
      if (val.hasOwnProperty('re')) {

        offensive_words.push({
          re: ((val.re instanceof RegExp) ? val.re : (new RegExp(val.re, "i"))),
          level: val.level || 0
        });
      }
    });
  });

  chatLog.find().sort('ts', -1).limit(5).toArray(function(err, items) {
    items.forEach(function(val) {
      messages_data.unshift(val);
    });
  });

  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set("view options", { layout: false });

  app.use(express.static(__dirname + '../../public'));

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
    console.dir(socket);
    socket.on('setPseudo', function (pseudoName) {
      if (members.strInArray(pseudoName) || login_blacklist.strInArray(pseudoName) || ! /^[a-z0-9]+$/i.test(pseudoName) ) {
        socket.emit('command', {'type':'relogin'} );
      }
      else {
        socket.username = pseudoName;
        members.push(pseudoName);
        socket.emit('command', {'type':'succefull_login'} );
        var data = { 'message' : 'New user [' + pseudoName + '] connected', pseudo : 'bot', 'hclass' : 'server', 'ts' : ts() };
        socket.broadcast.emit('message', data);
        socket.emit('members', members);
        socket.broadcast.emit('members', members);
        members_data[pseudoName]={socket_id:socket.id, 'ts' : ts(),
          'color': Math.round(Math.random()*5)
        };
        for (var i in messages_data) {
          socket.emit('message', messages_data[i]);
        }
        chatLog.insert(data, function(err, result){
          "use strict";
          if (!err) {
            console.log(result);} else {console.log(err);}
        });
      }
    });
    socket.on('disconnect', function() {
      var name = socket.username;
      if (name != null && !login_blacklist.strInArray(name)) {
        var data = { 'message' : 'User [' + name + '] disconnected', pseudo : 'bot', 'hclass' : 'server', 'ts' : ts() };
        socket.broadcast.emit('message', data);
        var u_index = members.indexOf(name);
        if (u_index > -1) {
          members.splice(u_index, 1);
        }
        delete members_data[name];
        socket.broadcast.emit('members', members);
        chatLog.insert(data, function(err, result){
          "use strict";
          if (!err) {
            console.log(result);} else {console.log(err);}
        });
      }
      console.log("user " + name + " disconnected ");
    });
    socket.on('typing', function (ltState) {
      members_data[socket.username].state = 'typing';
      socket.broadcast.emit('state', {'member':socket.username, 'state': 'typing'});
    });
    socket.on('reading', function (ltState) {
      members_data[socket.username].state = 'reading';
      socket.broadcast.emit('state', {'member':socket.username, 'state': 'reading'});
    });

    socket.on('message', function (message) {
      //socket.get('pseudo', function (error, name) {
      var name = socket.username;
        if (name != null && !login_blacklist.strInArray(name)) {
          var pm = false;
          // personal message detection
          if (/^pm(\s+|\b)@/ig.test(message)) {
            //
            // console.log('Clients:');
            // console.log(members_data);
            var match = /^pm(\s+|\b)@(\w+)/ig.exec(message);
            console.log(':::::::' + match[2]+':::');
            if (typeof(match[2]) !== "undefined" && typeof(members_data[match[2]]) !== "undefined") {
              pm = true;
              if (isOffensive(message)) {
                socket.emit('message', { 'message' : filter_message('Роботы спасут мир!'), 'pseudo' : 'bot', 'hclass' : 'server', 'ts' : ts() } );

              } else {
                socket.emit('message', { 'message' : filter_message(message), 'pseudo' : name, 'hclass' : 'pm', 'ts' : ts() } );

                io.sockets.socket(members_data[match[1]].socket_id).emit('message', {'message':filter_message(message.replace(/^pm\s+@(\w+)/ig, '')),'pseudo':name,'hclass':'pm', 'ts' : ts()});
              }

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
            if (isOffensive(message)) {
              message = '...<oops!>...';
            }
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
            var data = { 'message' : filtered_message, 'pseudo' : name, 'hclass' : 'regular', 'ts' : ts(),
              color: members_data[name]['color']
            };
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
      //})
    });
  });

});

