const mongoose = require('mongoose');

const countdownSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
      maxlength: [100, 'Title must be 100 characters or fewer.'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description must be 500 characters or fewer.'],
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required.'],
    },
    category: {
      type: String,
      enum: ['personal', 'work', 'travel', 'celebration', 'other'],
      default: 'other',
    },
    pinned: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true } // adds createdAt and updatedAt
);

countdownSchema.index({ targetDate: 1 });

module.exports = mongoose.model('Countdown', countdownSchema);