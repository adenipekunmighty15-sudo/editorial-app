const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String, default: '' },
    readTime: { type: Number, required: true, default: 5, min: 1 },
    responses: { type: Number, required: true, default: 0, min: 0 },
    likes: { type: Number, required: true, default: 0, min: 0 },
    featured: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

storySchema.pre('validate', function () {
  if (this.excerpt == null) this.excerpt = '';
});

module.exports = mongoose.model('Story', storySchema);
