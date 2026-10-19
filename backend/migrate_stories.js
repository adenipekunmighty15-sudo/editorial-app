    const supabase = require('./config/supabase');

async function migrate() {
  console.log('Starting migration: Creating stories table...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.stories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT,
        excerpt TEXT,
        read_time INTEGER,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      ALTER PUBLICATION supabase_realtime ADD TABLE stories;
      
      -- Enable RLS
      ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
      
      -- Allow anyone to read stories
      CREATE POLICY "Stories are viewable by everyone" ON public.stories
        FOR SELECT USING (true);
        
      -- Allow authenticated users to insert/update
      CREATE POLICY "Users can create and edit their own stories" ON public.stories
        FOR ALL USING (auth.uid() = (select auth.uid()));
    `
  });

  if (error) {
    console.error('Migration error:', error);
  } else {
    console.log('Migration successful: stories table is ready and Realtime is enabled.');
  }
}

migrate();
