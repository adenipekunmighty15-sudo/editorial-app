const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.SUPABASE_DB_URL;

const client = new Client({
  connectionString: connectionString,
});

const schema = `
  -- 1. Cleanup existing tables to apply NOT NULL constraints
  DROP TABLE IF EXISTS stories;
  DROP TABLE IF EXISTS clubs;
  DROP TABLE IF EXISTS books;

  -- 2. Books Table (Non-nullable)
  CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    color TEXT NOT NULL DEFAULT 'sage',
    published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 3. Clubs Table (Non-nullable)
  CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    book TEXT NOT NULL,
    members TEXT NOT NULL DEFAULT '0',
    time TEXT NOT NULL DEFAULT 'Anytime',
    image TEXT NOT NULL DEFAULT '',
    is_reading_now BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 4. Stories Table (Non-nullable)
  CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    read_time INTEGER NOT NULL DEFAULT 5 CHECK (read_time >= 1),
    responses INTEGER NOT NULL DEFAULT 0 CHECK (responses >= 0),
    likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 5. Trigger for updated_at
  CREATE OR REPLACE FUNCTION update_modified_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  CREATE TRIGGER update_books_modtime BEFORE UPDATE ON books FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
  CREATE TRIGGER update_clubs_modtime BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
  CREATE TRIGGER update_stories_modtime BEFORE UPDATE ON stories FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
`;

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to Supabase...');
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('✅ Database schema updated to NON-NULLABLE successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
