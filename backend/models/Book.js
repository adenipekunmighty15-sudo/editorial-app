const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    tag: { type: String },
    genre: { type: String },
    image: { type: String },
    progress: { type: Number, default: 0 },
    color: { type: String, default: 'sage' },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Book', bookSchema);