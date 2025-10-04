// Setup Supabase Database Schema
const fs = require('fs');
const https = require('https');

const config = JSON.parse(fs.readFileSync('supabase-config.json', 'utf8'));

// SQL Schema
const schema = `
-- Users table
create table if not exists users (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  photo_url text,
  is_admin boolean default false,
  digger_score integer default 0,
  total_likes integer default 0,
  tracks_submitted integer default 0,
  fcm_tokens text[],
  notifications_enabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tracks table
create table if not exists tracks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  title text not null,
  artist text not null,
  platform text not null check (platform in ('spotify', 'youtube', 'soundcloud')),
  url text not null,
  embed_url text not null,
  submitted_by text not null,
  likes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete set null,
  username text not null,
  message text not null,
  is_admin boolean default false,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Comments table
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  track_id uuid references tracks(id) on delete cascade not null,
  user_id uuid references users(id) on delete set null,
  username text not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications table
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  type text not null check (type in ('like', 'comment')),
  track_id uuid references tracks(id) on delete cascade,
  track_title text not null,
  from_user_id uuid references users(id) on delete set null,
  from_username text not null,
  comment_text text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index if not exists tracks_user_id_idx on tracks(user_id);
create index if not exists tracks_created_at_idx on tracks(created_at desc);
create index if not exists messages_created_at_idx on messages(created_at desc);
create index if not exists comments_track_id_idx on comments(track_id);
create index if not exists comments_created_at_idx on comments(created_at desc);
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_created_at_idx on notifications(created_at desc);
create index if not exists notifications_read_idx on notifications(read) where read = false;

-- Row Level Security (RLS)
alter table users enable row level security;
alter table tracks enable row level security;
alter table messages enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;

-- Drop existing policies if any
drop policy if exists "Users are viewable by everyone" on users;
drop policy if exists "Users can update own profile" on users;
drop policy if exists "Tracks are viewable by everyone" on tracks;
drop policy if exists "Authenticated users can create tracks" on tracks;
drop policy if exists "Users can update own tracks" on tracks;
drop policy if exists "Users can delete own tracks" on tracks;
drop policy if exists "Messages are viewable by everyone" on messages;
drop policy if exists "Authenticated users can create messages" on messages;
drop policy if exists "Comments are viewable by everyone" on comments;
drop policy if exists "Authenticated users can create comments" on comments;
drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "System can create notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;

-- RLS Policies
create policy "Users are viewable by everyone" on users for select using (true);
create policy "Users can update own profile" on users for update using (auth.uid() = id);

create policy "Tracks are viewable by everyone" on tracks for select using (true);
create policy "Authenticated users can create tracks" on tracks for insert with check (auth.uid() = user_id);
create policy "Users can update own tracks" on tracks for update using (auth.uid() = user_id);
create policy "Users can delete own tracks" on tracks for delete using (auth.uid() = user_id);

create policy "Messages are viewable by everyone" on messages for select using (true);
create policy "Authenticated users can create messages" on messages for insert with check (auth.uid() is not null);

create policy "Comments are viewable by everyone" on comments for select using (true);
create policy "Authenticated users can create comments" on comments for insert with check (auth.uid() is not null);

create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "System can create notifications" on notifications for insert with check (true);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);
`;

// Execute SQL via Supabase REST API
function executeSQL(sql) {
    return new Promise((resolve, reject) => {
        const url = new URL(config.SUPABASE_URL + '/rest/v1/rpc/exec_sql');

        const postData = JSON.stringify({ query: sql });

        const options = {
            hostname: url.hostname,
            port: 443,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${config.SUPABASE_SERVICE_KEY}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

console.log('🚀 Setting up Supabase database schema...\n');
console.log('Project URL:', config.SUPABASE_URL);
console.log('\n📝 Creating tables, indexes, and RLS policies...\n');

// Note: Supabase REST API doesn't have direct SQL execution
// We need to use the SQL Editor UI or run migrations via Supabase CLI
console.log('⚠️  Automatic SQL execution requires Supabase CLI or manual execution');
console.log('\nPlease run the following SQL in your Supabase SQL Editor:');
console.log('👉 Go to: https://supabase.com/dashboard/project/mcologfwjggmmsihtrrq/sql/new\n');
console.log('=' .repeat(80));
console.log(schema);
console.log('=' .repeat(80));
console.log('\n✅ Copy the SQL above and paste it in the SQL Editor, then click RUN\n');

// Save SQL to file for easy copy-paste
fs.writeFileSync('supabase-schema.sql', schema);
console.log('💾 SQL saved to: supabase-schema.sql');
console.log('\nOnce you run the SQL, press any key to continue with code generation...');
