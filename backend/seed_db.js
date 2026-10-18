const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL,
});

const books = [
  { title: 'The Practice of the Presence of God', author: 'Brother Lawrence', tag: 'SPIRITUAL FORMATION', genre: 'Classic', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=500&q=80', progress: 0, color: 'terracotta' },
  { title: 'The Ruthless Elimination of Hurry', author: 'John Mark Comer', tag: 'SLOW LIVING', genre: 'Modern', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80', progress: 0, color: 'sage' },
  { title: 'Confessions', author: 'St. Augustine', tag: 'THEOLOGY', genre: 'Classic', image: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=500&q=80', progress: 0, color: 'plum' },
  { title: 'The Cost of Discipleship', author: 'Dietrich Bonhoeffer', tag: 'DISCIPLESHIP', genre: 'Theology', image: 'https://images.unsplash.com/photo-1491843351663-851759696461?auto=format&fit=crop&w=500&q=80', progress: 0, color: 'slate' },
  { title: 'Mere Christianity', author: 'C.S. Lewis', tag: 'APOLOGETICS', genre: 'Non-Fiction', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=500&q=80', progress: 0, color: 'gold' },
];

const stories = [
  { title: 'The Silence of the Morning', author: 'Amara Okafor', content: 'There is a specific kind of silence that only exists at 5 AM... [full story]', excerpt: 'On finding God in the early hours.', read_time: 4, likes: 24, featured: true },
  { title: 'Learning to Let Go', author: 'Paps O.', content: 'For years I tried to control every outcome of my life... [full story]', excerpt: 'A reflection on trust and surrender.', read_time: 6, likes: 18, featured: false },
  { title: 'The Table of Belonging', author: 'Ifeoluwa A.', content: 'Hospitality is not about a clean house, but an open heart... [full story]', excerpt: 'On the spiritual art of the open table.', read_time: 5, likes: 42, featured: true },
];

const clubs = [
  { title: 'The Stillness Circle', book: 'The Practice of the Presence of God', members: '12 / 20', time: 'Every Monday', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=80', is_reading_now: true },
  { title: 'The Modern Monk', book: 'The Ruthless Elimination of Hurry', members: '8 / 15', time: 'Bi-weekly', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80', is_reading_now: false },
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected to Supabase for seeding...');

    await client.query('BEGIN');

    for (const book of books) {
      await client.query('INSERT INTO books (title, author, tag, genre, image, progress, color) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
      [book.title, book.author, book.tag, book.genre, book.image, book.progress, book.color]);
    }

    for (const story of stories) {
      await client.query('INSERT INTO stories (title, author, content, excerpt, read_time, likes, featured) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
      [story.title, story.author, story.content, story.excerpt, story.read_time, story.likes, story.featured]);
    }

    for (const club of clubs) {
      await client.query('INSERT INTO clubs (title, book, members, time, image, is_reading_now) VALUES ($1, $2, $3, $4, $5, $6)', 
      [club.title, club.book, club.members, club.time, club.image, club.is_reading_now]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed data successfully injected!');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.end();
  }
}

seed();
