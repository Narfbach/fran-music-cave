# Migración a Supabase - Plan Completo

## Por qué Supabase es mejor para este proyecto

### Firebase (actual)
- ❌ Cloud Functions requiere plan de pago
- ❌ Firestore tiene límites estrictos
- ❌ Queries complejas limitadas
- ❌ No tiene SQL
- ⚠️ Vendor lock-in fuerte

### Supabase (mejor opción)
- ✅ Edge Functions **100% gratis**
- ✅ PostgreSQL completo (queries ilimitadas)
- ✅ Realtime subscriptions (como Firestore)
- ✅ Row Level Security (seguridad avanzada)
- ✅ Storage incluido gratis
- ✅ Auth más simple y potente
- ✅ REST API automática
- ✅ Open source (puedes self-host)

## Paso 1: Crear Proyecto Supabase

1. Ve a https://supabase.com
2. Click "Start your project"
3. Login con GitHub
4. Click "New Project"
5. Configuración:
   - **Organization**: Personal (o crea "The Music Cave")
   - **Name**: `fran-music-cave`
   - **Database Password**: (genera una segura)
   - **Region**: South America (São Paulo) - más cerca de tus usuarios
   - **Pricing**: Free (hasta 500MB database, 1GB storage, 2GB bandwidth)
6. Click "Create new project"
7. **Guarda las credenciales** que aparecen:
   - Project URL
   - API Key (anon/public)
   - Service Role Key (secret)

## Paso 2: Schema de Base de Datos

```sql
-- Users table
create table users (
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
create table tracks (
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
create table messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete set null,
  username text not null,
  message text not null,
  is_admin boolean default false,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Comments table
create table comments (
  id uuid default gen_random_uuid() primary key,
  track_id uuid references tracks(id) on delete cascade not null,
  user_id uuid references users(id) on delete set null,
  username text not null,
  text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications table
create table notifications (
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
create index tracks_user_id_idx on tracks(user_id);
create index tracks_created_at_idx on tracks(created_at desc);
create index messages_created_at_idx on messages(created_at desc);
create index comments_track_id_idx on comments(track_id);
create index comments_created_at_idx on comments(created_at desc);
create index notifications_user_id_idx on notifications(user_id);
create index notifications_created_at_idx on notifications(created_at desc);
create index notifications_read_idx on notifications(read) where read = false;

-- Row Level Security (RLS)
alter table users enable row level security;
alter table tracks enable row level security;
alter table messages enable row level security;
alter table comments enable row level security;
alter table notifications enable row level security;

-- RLS Policies

-- Users: anyone can read, only own user can update
create policy "Users are viewable by everyone" on users for select using (true);
create policy "Users can update own profile" on users for update using (auth.uid() = id);

-- Tracks: anyone can read, authenticated users can insert, only owner can delete
create policy "Tracks are viewable by everyone" on tracks for select using (true);
create policy "Authenticated users can create tracks" on tracks for insert with check (auth.uid() = user_id);
create policy "Users can update own tracks" on tracks for update using (auth.uid() = user_id);
create policy "Users can delete own tracks" on tracks for delete using (auth.uid() = user_id);

-- Messages: anyone can read, authenticated users can insert
create policy "Messages are viewable by everyone" on messages for select using (true);
create policy "Authenticated users can create messages" on messages for insert with check (auth.uid() is not null);

-- Comments: anyone can read, authenticated users can insert
create policy "Comments are viewable by everyone" on comments for select using (true);
create policy "Authenticated users can create comments" on comments for insert with check (auth.uid() is not null);

-- Notifications: users can only see their own
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "System can create notifications" on notifications for insert with check (true);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);

-- Realtime subscriptions
alter publication supabase_realtime add table tracks;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table notifications;
```

## Paso 3: Edge Function para Push Notifications

```typescript
// supabase/functions/send-push-notification/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, type, trackData, fromUsername } = await req.json()

    // Get user's FCM tokens
    const { data: user } = await supabase
      .from('users')
      .select('fcm_tokens')
      .eq('id', userId)
      .single()

    if (!user || !user.fcm_tokens || user.fcm_tokens.length === 0) {
      return new Response(JSON.stringify({ error: 'No FCM tokens' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Send push notification via FCM
    const title = type === 'like' ? '❤️ New Like!' : '💬 New Comment!'
    const body = `${fromUsername} ${type === 'like' ? 'liked' : 'commented on'} "${trackData.title}"`

    // Use FCM HTTP v1 API
    const messages = user.fcm_tokens.map(token => ({
      message: {
        token,
        notification: { title, body },
        data: {
          trackId: trackData.id,
          url: 'https://narfbach.github.io/fran-music-cave/'
        }
      }
    }))

    // Send notifications
    // (You'll need FCM server key in Supabase secrets)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

## Ventajas de la migración

1. **Push Notifications gratis** con Edge Functions
2. **Queries SQL** mucho más potentes que Firestore
3. **Joins, aggregations, views** - todo lo que necesites
4. **Mejor performance** con indexes
5. **Row Level Security** - seguridad a nivel de fila automática
6. **Realtime subscriptions** igual que Firebase pero mejor
7. **Sin vendor lock-in** - es PostgreSQL estándar
8. **Dashboard mejor** para ver y editar datos
9. **Costos más bajos** a escala

## Siguientes pasos

Una vez que crees el proyecto en Supabase:
1. Copia las credenciales
2. Ejecuta el SQL schema en el SQL Editor
3. Yo automatizo toda la migración del código
4. Migración de datos existentes (usuarios, tracks, messages)
5. Deploy Edge Function
6. Testing completo
7. Switch al nuevo sistema

**¿Quieres que continúe con la migración automática?**
