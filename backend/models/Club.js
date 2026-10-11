const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    book: { type: String, required: true },
    members: { type: String },
    time: { type: String },
    image: { type: String },
    isReadingNow: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Club', clubSchema);