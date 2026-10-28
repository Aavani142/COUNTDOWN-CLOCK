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
  },
  { timestamps: true } // adds createdAt and updatedAt
);

countdownSchema.index({ targetDate: 1 });

module.exports = mongoose.model('Countdown', countdownSchema);
