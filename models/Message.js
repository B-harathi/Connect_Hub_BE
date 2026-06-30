const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'voice', 'system'],
    default: 'text'
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'text' || this.messageType === 'system';
    },
    maxlength: [1000, 'Message content cannot exceed 1000 characters']
  },
  file: {
    url: {
      type: String,
      required: function() {
        return ['image', 'file', 'voice'].includes(this.messageType);
      }
    },
    publicId: {
      type: String,
      required: function() {
        return ['image', 'file', 'voice'].includes(this.messageType);
      }
    },
    originalName: {
      type: String
    },
    size: {
      type: Number
    },
    mimeType: {
      type: String
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'readBy.user': 1 });

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Virtual for read count
messageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Virtual for delivery count
messageSchema.virtual('deliveryCount').get(function() {
  return this.deliveredTo.length;
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Set deletion timestamp when message is deleted
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from user
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji
  });
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to mark as read by user
messageSchema.methods.markAsRead = function(userId) {
  // Check if already read
  const alreadyRead = this.readBy.some(
    read => read.user.toString() === userId.toString()
  );
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to mark as delivered to user
messageSchema.methods.markAsDelivered = function(userId) {
  // Check if already delivered
  const alreadyDelivered = this.deliveredTo.some(
    delivery => delivery.user.toString() === userId.toString()
  );
  
  if (!alreadyDelivered) {
    this.deliveredTo.push({
      user: userId,
      deliveredAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Method to edit message
messageSchema.methods.editMessage = function(newContent) {
  // Add to edit history
  if (this.content) {
    this.editHistory.push({
      content: this.content,
      editedAt: new Date()
    });
  }
  
  this.content = newContent;
  this.isEdited = true;
  return this.save();
};

// Method to soft delete message
messageSchema.methods.deleteMessage = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.content = 'This message was deleted';
  return this.save();
};

// Method to check if user can see message
messageSchema.methods.canUserSee = function(userId) {
  if (this.isDeleted) {
    // Only sender and admins can see deleted messages
    return this.sender.toString() === userId.toString();
  }
  return true;
};

// Static method to get chat messages with pagination
messageSchema.statics.getChatMessages = function(chatId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({
    chat: chatId,
    isDeleted: false
  })
  .populate('sender', 'name email avatar')
  .populate('replyTo', 'content messageType sender')
  .populate({
    path: 'replyTo',
    populate: {
      path: 'sender',
      select: 'name email avatar'
    }
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip(skip);
};

// Static method to get unread message count for user
messageSchema.statics.getUnreadCount = function(chatId, userId) {
  return this.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId },
    isDeleted: false
  });
};

// Static method to mark all messages as read for user
messageSchema.statics.markAllAsRead = function(chatId, userId) {
  return this.updateMany(
    {
      chat: chatId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
      isDeleted: false
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    }
  );
};

// Static method to search messages
messageSchema.statics.searchMessages = function(chatId, searchTerm, limit = 20) {
  const regex = new RegExp(searchTerm, 'i');
  
  return this.find({
    chat: chatId,
    messageType: 'text',
    content: regex,
    isDeleted: false
  })
  .populate('sender', 'name email avatar')
  .sort({ createdAt: -1 })
  .limit(limit);
};

module.exports = mongoose.model('Message', messageSchema);