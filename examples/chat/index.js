// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;

server.listen(port,function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom


var numUsers = 0;
var groups = {}


io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'

    socket.broadcast.to(socket.room).emit('new message', {
      username: socket.username,
      message: data.message,
      timestamp: data.timestamp
    });
  });

  // when the client emits 'add user', this listens and executes


  socket.on('add user', function (username,groupID) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    if(groups[groupID]== null){
    groups[groupID] = []
    }
    groups[groupID].push(username)
    socket.room = groupID
    socket.join(groupID)
    console.log(socket.username+"   "+socket.room)
   /* if(username.substr(0, 1) == 'A' ) {
    socket.room = 'roomA';
    socket.join('roomA');
    console.log(username+'equal to room A')
    }
    else{
    socket.room = 'roomB';
    socket.join('roomB');
    console.log(username+'equal to room B')

    }*/
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: groups[groupID].length
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(socket.room).emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.to(socket.room).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(socket.room).emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.to(socket.room).emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
