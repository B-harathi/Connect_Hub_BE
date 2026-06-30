const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

const registerChatEvents = (socket, io) => {
  
  // Handle real-time message sending
  socket.on('sendMessage', async (data) => {
    try {
      const { chatId, content, messageType = 'text', replyTo } = data;
      const senderId = socket.userId;

      // Verify chat exists and user is participant
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isUserParticipant(senderId)) {
        socket.emit('error', { message: 'Access denied or chat not found' });
        return;
      }

      // Create message
      const message = new Message({
        chat: chatId,
        sender: senderId,
        messageType,
        content: messageType === 'text' ? content : undefined,
        replyTo: replyTo || undefined
      });

      await message.save();
      await message.populate('sender', 'name email avatar');
      
      if (replyTo) {
        await message.populate({
          path: 'replyTo',
          populate: {
            path: 'sender',
            select: 'name email avatar'
          }
        });
      }

      // Update chat's last message and activity
      chat.lastMessage = message._id;
      await chat.updateLastActivity();

      // Mark as delivered to sender
      await message.markAsDelivered(senderId);

      // Emit to all chat participants
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('newMessage', {
          message,
          chat: {
            _id: chat._id,
            chatType: chat.chatType,
            chatName: chat.chatName
          }
        });
      });

      // Emit to chat room
      io.to(`chat_${chatId}`).emit('messageAdded', message);

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle message reactions in real-time
  socket.on('addReaction', async (data) => {
    try {
      const { messageId, emoji } = data;
      const userId = socket.userId;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Verify user is participant
      const chat = await Chat.findById(message.chat);
      if (!chat || !chat.isUserParticipant(userId)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      await message.addReaction(userId, emoji);

      // Emit to all chat participants
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('reactionAdded', {
          messageId,
          reaction: {
            user: socket.user,
            emoji,
            createdAt: new Date()
          }
        });
      });

    } catch (error) {
      console.error('Add reaction error:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });

  // Handle message editing in real-time
  socket.on('editMessage', async (data) => {
    try {
      const { messageId, newContent } = data;
      const userId = socket.userId;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Only sender can edit
      if (message.sender.toString() !== userId) {
        socket.emit('error', { message: 'You can only edit your own messages' });
        return;
      }

      if (message.messageType !== 'text') {
        socket.emit('error', { message: 'Can only edit text messages' });
        return;
      }

      await message.editMessage(newContent);

      // Emit to all chat participants
      const chat = await Chat.findById(message.chat);
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('messageEdited', {
          messageId,
          newContent,
          editedAt: new Date(),
          isEdited: true
        });
      });

    } catch (error) {
      console.error('Edit message error:', error);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

  // Handle message deletion in real-time
  socket.on('deleteMessage', async (data) => {
    try {
      const { messageId } = data;
      const userId = socket.userId;

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      const chat = await Chat.findById(message.chat);
      const canDelete = message.sender.toString() === userId || 
                       (chat.chatType === 'group' && chat.isUserAdmin(userId));

      if (!canDelete) {
        socket.emit('error', { message: 'You can only delete your own messages or be an admin' });
        return;
      }

      await message.deleteMessage(userId);

      // Emit to all chat participants
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('messageDeleted', {
          messageId,
          deletedBy: userId,
          deletedAt: new Date()
        });
      });

    } catch (error) {
      console.error('Delete message error:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  });

  // Handle chat creation notifications
  socket.on('chatCreated', async (data) => {
    try {
      const { chatId, participants } = data;

      // Notify all participants about new chat
      participants.forEach(participantId => {
        if (participantId !== socket.userId) {
          io.to(`user_${participantId}`).emit('newChatCreated', {
            chatId,
            createdBy: socket.user,
            createdAt: new Date()
          });
        }
      });

    } catch (error) {
      console.error('Chat created notification error:', error);
    }
  });

  // Handle user joining chat room
  socket.on('joinChatRoom', async (chatId) => {
    try {
      // Verify user is participant
      const chat = await Chat.findById(chatId);
      if (chat && chat.isUserParticipant(socket.userId)) {
        socket.join(`chat_${chatId}`);
        
        // Notify others in chat about user joining
        socket.to(`chat_${chatId}`).emit('userJoinedChat', {
          userId: socket.userId,
          name: socket.user.name,
          avatar: socket.user.avatar,
          chatId
        });
      }
    } catch (error) {
      console.error('Join chat room error:', error);
    }
  });

  // Handle user leaving chat room
  socket.on('leaveChatRoom', async (chatId) => {
    try {
      socket.leave(`chat_${chatId}`);
      
      // Notify others in chat about user leaving
      socket.to(`chat_${chatId}`).emit('userLeftChat', {
        userId: socket.userId,
        chatId
      });
    } catch (error) {
      console.error('Leave chat room error:', error);
    }
  });

  // Handle marking messages as read
  socket.on('markMessagesAsRead', async (data) => {
    try {
      const { chatId, messageIds } = data;
      const userId = socket.userId;

      // Verify user is participant
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isUserParticipant(userId)) {
        return;
      }

      // Mark messages as read
      if (messageIds && messageIds.length > 0) {
        await Promise.all(
          messageIds.map(async (messageId) => {
            const message = await Message.findById(messageId);
            if (message && message.sender.toString() !== userId) {
              await message.markAsRead(userId);
              
              // Notify sender
              io.to(`user_${message.sender}`).emit('messageReadReceipt', {
                messageId,
                readBy: userId,
                readAt: new Date()
              });
            }
          })
        );
      }

    } catch (error) {
      console.error('Mark messages as read error:', error);
    }
  });

  // Handle participant added to group
  socket.on('participantAdded', async (data) => {
    try {
      const { chatId, participantId, addedBy } = data;

      // Notify the new participant
      io.to(`user_${participantId}`).emit('addedToGroup', {
        chatId,
        addedBy: socket.user,
        addedAt: new Date()
      });

      // Notify other participants
      const chat = await Chat.findById(chatId).populate('participants', 'name email avatar');
      if (chat) {
        chat.participants.forEach(participant => {
          if (participant._id.toString() !== participantId && participant._id.toString() !== socket.userId) {
            io.to(`user_${participant._id}`).emit('participantJoined', {
              chatId,
              participant: {
                _id: participantId,
                name: participant.name,
                avatar: participant.avatar
              },
              addedBy: socket.user
            });
          }
        });
      }

    } catch (error) {
      console.error('Participant added notification error:', error);
    }
  });

  // Handle participant removed from group
  socket.on('participantRemoved', async (data) => {
    try {
      const { chatId, participantId, removedBy } = data;

      // Notify the removed participant
      io.to(`user_${participantId}`).emit('removedFromGroup', {
        chatId,
        removedBy: socket.user,
        removedAt: new Date()
      });

      // Notify other participants
      const chat = await Chat.findById(chatId);
      if (chat) {
        chat.participants.forEach(participant => {
          if (participant.toString() !== participantId && participant.toString() !== socket.userId) {
            io.to(`user_${participant}`).emit('participantLeft', {
              chatId,
              participantId,
              removedBy: socket.user
            });
          }
        });
      }

    } catch (error) {
      console.error('Participant removed notification error:', error);
    }
  });

};

module.exports = {
  registerChatEvents
};