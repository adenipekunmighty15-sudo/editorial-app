const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    tag: { type: String, default: '', trim: true },
    genre: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    progress: { type: Number, required: true, default: 0, min: 0, max: 100 },
    color: { type: String, required: true, default: 'sage' },
    published: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

bookSchema.pre('validate', function () {
  if (this.tag == null) this.tag = '';
  if (this.genre == null) this.genre = '';
  if (this.image == null) this.image = '';
});

module.exports = mongoose.model('Book', bookSchema);
