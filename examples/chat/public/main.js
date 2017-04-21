$(function () {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7',
    '#1bb76a', '#a33bcd', '#8b72b1', '#dcba4d'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $groupInput = $('.groupInput');

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  var $sleepButton = $('.sleepButton');
  var $sleepButton2 = $('.sleepButton2');
  var $unreadButton = $('.unreadButton');
  var $leaveButton = $('.leaveButton');


  // Prompt for setting a username
  var username;
  var groupID;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput; //= $usernameInput.focus();

  var socket = io();

  $sleepButton2.hide();

  function addParticipantsMessage(data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 people in this room";
    } else {
      message += "there are " + data.numUsers + " people in this room";
    }
    log(message);
  }

  function Notify(text, callback, close_callback, style) {

    var time = '10000';
    var $container = $('#notifications');
    var icon = '<i class="fa fa-info-circle "></i>';

    if (typeof style == 'undefined') style = 'warning'

    var html = $('<div class="alert alert-' + style + '  hide">' + icon + " " + text + '</div>');

    $('<a>', {
      text: '×',
      class: 'button close',
      style: 'padding-left: 10px;',
      href: '#',
      click: function (e) {
        e.preventDefault()
        close_callback && close_callback()
        remove_notice()
      }
    }).prependTo(html)

    $container.prepend(html)
    html.removeClass('hide').hide().fadeIn('slow')

    function remove_notice() {
      html.stop().fadeOut('slow').remove()
    }

    var timer = setInterval(remove_notice, time);

    $(html).hover(function () {
      clearInterval(timer);
    }, function () {
      timer = setInterval(remove_notice, time);
    });

    html.on('click', function () {
      clearInterval(timer)
      callback && callback()
      remove_notice()
    });
  }

  // Sets the client's username
  function setUsername() {
    username = cleanInput($usernameInput.val().trim());
    groupID = cleanInput($groupInput.val().trim());
    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username, groupID);
      //  socket.emit('select group', username);
    }
  }

  // Sends a chat message
  function sendMessage() {
    var message = $inputMessage.val();

    // Prevent markup from being injected into the message
    message = cleanInput(message);
    var dt = new Date();
    var timestamp = dt.toUTCString();
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message,
        timestamp: timestamp
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', {
        message: message,
        timestamp: timestamp
      });
    }
  }

  // Log a message
  function log(message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage(data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);
    var $timestampBodyDiv = $('<span class="timestampBody">   ')
      .text(data.timestamp);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv, $timestampBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput(input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping() {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages(data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor(username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  //Button events
  $leaveButton.click(function () {
    //socket.emit('leave room');
    var r = confirm("Are you sure you want to leave group ?");
    if (r == true) {
      window.location.reload();
    }
  });

  $sleepButton.click(function () {
    alertify.error('Notification Off');
    $sleepButton2.show();
    $sleepButton.hide();


  });

  $sleepButton2.click(function () {
    //socket.emit('leave room');
    alertify.success('Notification On');
    $sleepButton2.hide();
    $sleepButton.show();
  });

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    // if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    //   $currentInput.focus();
    // }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function () {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    //currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome '" + data.username + "' to The Chat App – Room: " + data.groupID;
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });

});
socket.on('updaterooms', function (rooms, current_room) {
  $('#rooms').empty();
  $.each(rooms, function (key, value) {
    if (value == current_room) {
      $('#rooms').append('<div>' + value + '</div>');
    } else {
      $('#rooms').append('<div><a href="#" onclick="switchRoom(\'' + value + '\')">' + value + '</a></div>');
    }
  });
});