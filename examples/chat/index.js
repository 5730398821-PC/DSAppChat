// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var port = process.env.PORT || 3000;

// edit
var app = require('express')(),
  server  = require("http").createServer(app),
  io = require("socket.io")(server),
  session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
  }),
  sharedsession = require("express-socket.io-session");
app.use(session);
io.use(sharedsession(session));
//end

server.listen(port,function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom


//var numUsers = {};
var groups = {};


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
    socket.groupID = groupID;
    if(groups[groupID]== null){
    groups[groupID] = []
    //numUsers[groupID] = []
    }
    groups[groupID].push(username)
    socket.room = groupID
    socket.join(groupID)
    //console.log(socket.username+"   "+socket.room)
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
    //++numUsers[groupID]
    addedUser = true;
    socket.handshake.session.save();
    socket.emit('login', {

      numUsers: groups[groupID].length,
      groupID: groupID,
      username: socket.username
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(socket.room).emit('user joined', {

      username: socket.username,
      numUsers: groups[socket.groupID].length
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
    socket.handshake.session.save();
    if (addedUser) {
      //--numUsers[socket.groupID];
      for(var i = groups[socket.groupID].length - 1; i >= 0; i--) {
        if(groups[socket.groupID][i] === socket.username) {
          groups[socket.groupID].splice(i, 1);
          break;
        }
      }
      //console.log('successfully left');
      // echo globally that this client has left
      socket.broadcast.to(socket.room).emit('user left', {
        username: socket.username,
        numUsers: groups[socket.groupID].length
      });
      //console.log('broadcast user left');

    }
  });

  socket.on('leave room', function () {
      //--numUsers[socket.groupID];
      for(var i = groups[socket.groupID].length - 1; i >= 0; i--) {
        if(groups[socket.groupID][i] === socket.username) {
          groups[socket.groupID].splice(i, 1);
          break;
        }
      }
      console.log('successfully left');
      // echo globally that this client has left
      socket.broadcast.to(socket.room).emit('user left', {
        username: socket.username,
        numUsers: groups[socket.groupID].length
      });
      console.log('broadcast user left');


  });


});
