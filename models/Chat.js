const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  chatType: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  chatName: {
    type: String,
    trim: true,
    maxlength: [50, 'Chat name cannot exceed 50 characters']
  },
  chatImage: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    default: ''
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  settings: {
    allowMessagesFrom: {
      type: String,
      enum: ['everyone', 'admins'],
      default: 'everyone'
    },
    muteNotifications: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ chatType: 1 });
chatSchema.index({ createdBy: 1 });

// Virtual for participant count
chatSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Pre-save middleware
chatSchema.pre('save', function(next) {
  // Update last activity when chat is modified
  this.lastActivity = new Date();
  
  // Set chat name for private chats
  if (this.chatType === 'private' && !this.chatName) {
    this.chatName = 'Private Chat';
  }
  
  // Add creator as admin for group chats
  if (this.chatType === 'group' && this.isNew) {
    if (!this.admins.includes(this.createdBy)) {
      this.admins.push(this.createdBy);
    }
  }
  
  next();
});

// Method to add participant
chatSchema.methods.addParticipant = function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    this.lastActivity = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove participant
chatSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(
    participant => participant.toString() !== userId.toString()
  );
  
  // Remove from admins if they were admin
  this.admins = this.admins.filter(
    admin => admin.toString() !== userId.toString()
  );
  
  this.lastActivity = new Date();
  return this.save();
};

// Method to add admin
chatSchema.methods.addAdmin = function(userId) {
  if (this.participants.includes(userId) && !this.admins.includes(userId)) {
    this.admins.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove admin
chatSchema.methods.removeAdmin = function(userId) {
  // Can't remove the creator
  if (userId.toString() === this.createdBy.toString()) {
    throw new Error('Cannot remove chat creator from admins');
  }
  
  this.admins = this.admins.filter(
    admin => admin.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check if user is admin
chatSchema.methods.isUserAdmin = function(userId) {
  return this.admins.some(admin => admin.toString() === userId.toString());
};

// Method to check if user is participant
chatSchema.methods.isUserParticipant = function(userId) {
  return this.participants.some(participant => participant.toString() === userId.toString());
};

// Method to update last activity
chatSchema.methods.updateLastActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Static method to find user's chats
chatSchema.statics.findUserChats = function(userId) {
  return this.find({
    participants: userId,
    isActive: true
  })
  .populate('participants', 'name email avatar isOnline lastActive')
  .populate('lastMessage')
  .populate('createdBy', 'name email')
  .sort({ lastActivity: -1 });
};

// Static method to find private chat between two users
chatSchema.statics.findPrivateChat = function(user1Id, user2Id) {
  return this.findOne({
    chatType: 'private',
    participants: { 
      $all: [user1Id, user2Id],
      $size: 2
    },
    isActive: true
  })
  .populate('participants', 'name email avatar isOnline lastActive')
  .populate('lastMessage');
};

// Static method to create private chat
chatSchema.statics.createPrivateChat = function(user1Id, user2Id) {
  return this.create({
    participants: [user1Id, user2Id],
    chatType: 'private',
    createdBy: user1Id
  });
};

// Static method to create group chat
chatSchema.statics.createGroupChat = function(data) {
  const { name, description, participants, createdBy, chatImage } = data;
  
  return this.create({
    chatName: name,
    description,
    participants,
    createdBy,
    chatImage: chatImage || '',
    chatType: 'group',
    admins: [createdBy]
  });
};

module.exports = mongoose.model('Chat', chatSchema);