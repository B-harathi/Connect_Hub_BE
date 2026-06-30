const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const chatEvents = require('./chatEvents');

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle socket connections
  io.on('connection', async (socket) => {
    try {
      console.log(`🔗 User connected: ${socket.user.name} (${socket.userId})`);

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);

      // Update user online status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        socketId: socket.id,
        lastActive: new Date()
      });

      // Broadcast user online status to friends/contacts
      socket.broadcast.emit('userOnline', {
        userId: socket.userId,
        name: socket.user.name,
        avatar: socket.user.avatar
      });

      // Register chat event handlers
      chatEvents.registerChatEvents(socket, io);

      // Handle user typing
      socket.on('typing', (data) => {
        socket.to(`chat_${data.chatId}`).emit('userTyping', {
          userId: socket.userId,
          name: socket.user.name,
          chatId: data.chatId
        });
      });

      // Handle user stopped typing
      socket.on('stopTyping', (data) => {
        socket.to(`chat_${data.chatId}`).emit('userStoppedTyping', {
          userId: socket.userId,
          chatId: data.chatId
        });
      });

      // Join chat rooms
      socket.on('joinChat', (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`📥 User ${socket.user.name} joined chat: ${chatId}`);
      });

      // Leave chat rooms
      socket.on('leaveChat', (chatId) => {
        socket.leave(`chat_${chatId}`);
        console.log(`📤 User ${socket.user.name} left chat: ${chatId}`);
      });

      // Handle message delivery confirmation
      socket.on('messageDelivered', async (data) => {
        try {
          const { messageId } = data;
          const Message = require('../models/Message');
          
          const message = await Message.findById(messageId);
          if (message) {
            await message.markAsDelivered(socket.userId);
            
            // Notify sender about delivery
            io.to(`user_${message.sender}`).emit('messageDeliveryConfirmed', {
              messageId,
              deliveredTo: socket.userId,
              deliveredAt: new Date()
            });
          }
        } catch (error) {
          console.error('Message delivery confirmation error:', error);
        }
      });

      // Handle message read confirmation
      socket.on('messageRead', async (data) => {
        try {
          const { messageId } = data;
          const Message = require('../models/Message');
          
          const message = await Message.findById(messageId);
          if (message && message.sender.toString() !== socket.userId) {
            await message.markAsRead(socket.userId);
            
            // Notify sender about read receipt
            io.to(`user_${message.sender}`).emit('messageReadConfirmed', {
              messageId,
              readBy: socket.userId,
              readAt: new Date()
            });
          }
        } catch (error) {
          console.error('Message read confirmation error:', error);
        }
      });

      // Handle user status updates
      socket.on('updateStatus', async (data) => {
        try {
          const { status } = data; // online, away, busy, offline
          
          await User.findByIdAndUpdate(socket.userId, {
            status: status || 'online',
            lastActive: new Date()
          });

          // Broadcast status update
          socket.broadcast.emit('userStatusUpdate', {
            userId: socket.userId,
            status,
            lastActive: new Date()
          });
        } catch (error) {
          console.error('Status update error:', error);
        }
      });

      // Handle voice call events
      socket.on('callUser', (data) => {
        const { to, offer, callType } = data;
        io.to(`user_${to}`).emit('incomingCall', {
          from: socket.userId,
          fromName: socket.user.name,
          fromAvatar: socket.user.avatar,
          offer,
          callType // 'audio' or 'video'
        });
      });

      socket.on('answerCall', (data) => {
        const { to, answer } = data;
        io.to(`user_${to}`).emit('callAnswered', {
          answer,
          from: socket.userId
        });
      });

      socket.on('rejectCall', (data) => {
        const { to } = data;
        io.to(`user_${to}`).emit('callRejected', {
          from: socket.userId
        });
      });

      socket.on('endCall', (data) => {
        const { to } = data;
        io.to(`user_${to}`).emit('callEnded', {
          from: socket.userId
        });
      });

      // Handle ICE candidates for WebRTC
      socket.on('iceCandidate', (data) => {
        const { to, candidate } = data;
        io.to(`user_${to}`).emit('iceCandidate', {
          candidate,
          from: socket.userId
        });
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        try {
          console.log(`🔌 User disconnected: ${socket.user.name} (${socket.userId})`);

          // Update user offline status
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            socketId: null,
            lastActive: new Date()
          });

          // Broadcast user offline status
          socket.broadcast.emit('userOffline', {
            userId: socket.userId,
            lastActive: new Date()
          });

        } catch (error) {
          console.error('Disconnect error:', error);
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

    } catch (error) {
      console.error('Socket connection error:', error);
      socket.disconnect(true);
    }
  });

  console.log('🚀 Socket.IO server initialized');
  return io;
};

// Get socket instance
const getSocketInstance = () => {
  return io;
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
  }
};

// Emit to chat room
const emitToChat = (chatId, event, data) => {
  if (io) {
    io.to(`chat_${chatId}`).emit(event, data);
  }
};

// Emit to all connected clients
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Get online users count
const getOnlineUsersCount = () => {
  if (io) {
    return io.sockets.sockets.size;
  }
  return 0;
};

// Get users in chat room
const getUsersInChat = (chatId) => {
  if (io) {
    const room = io.sockets.adapter.rooms.get(`chat_${chatId}`);
    return room ? Array.from(room) : [];
  }
  return [];
};

module.exports = {
  initializeSocket,
  getSocketInstance,
  emitToUser,
  emitToChat,
  emitToAll,
  getOnlineUsersCount,
  getUsersInChat
};