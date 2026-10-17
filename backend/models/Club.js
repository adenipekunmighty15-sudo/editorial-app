const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    book: { type: String, required: true, trim: true },
    members: { type: String, required: true, default: '0' },
    time: { type: String, required: true, default: 'Anytime' },
    image: { type: String, default: '', trim: true },
    isReadingNow: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

clubSchema.pre('validate', function () {
  if (this.image == null) this.image = '';
});

module.exports = mongoose.model('Club', clubSchema);
