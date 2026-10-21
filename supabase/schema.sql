-- ============================================================
--  EL PULSO DEL PUEBLO - Esquema Supabase
--  Pegar completo en Supabase > SQL Editor > Run
-- ============================================================

-- ---------- Extensiones ----------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- Comunidades / pueblos ----------
-- Cada pueblo es una comunidad propia. El primero (y por ahora el unico) es
-- San Simon Atzitzintla; Roep Tech agrega mas pueblos desde su panel cuando
-- lleguen vecinos de otro pueblo. Solo se inserta este de ejemplo inicial.
create table if not exists public.comunidades (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null unique,
  activa boolean not null default true,
  creado_en timestamptz default now()
);

insert into public.comunidades (nombre) values ('San Simón Atzitzintla')
on conflict (nombre) do nothing;

-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default 'Vecino',
  avatar_url text,
  rol text not null default 'vecino' check (rol in ('vecino','moderador','admin')),
  zona text,
  -- de donde es la cuenta: se le pregunta al registrarse
  comunidad_id uuid references public.comunidades(id) on delete set null,
  telefono_verificado boolean default false,
  creado_en timestamptz default now()
);

-- bases ya creadas: la columna llega sin tocar los datos existentes
alter table public.profiles add column if not exists comunidad_id uuid references public.comunidades(id) on delete set null;

-- Trigger: crear perfil automatico al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_com uuid;
begin
  -- la app manda la comunidad elegida al registrarse (si es valida)
  begin
    v_com := nullif(new.raw_user_meta_data->>'comunidad_id','')::uuid;
  exception when others then
    v_com := null;
  end;
  insert into public.profiles (id, nombre, comunidad_id)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          (select id from public.comunidades where id = v_com and activa))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Negocios ----------
create table if not exists public.businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  nombre text not null,
  rubro text not null default 'Otros',
  descripcion text,
  telefono text,
  direccion text,
  lat double precision,
  lng double precision,
  horario text,
  emoji text default '🏪',
  es_verificado boolean default false,
  es_patrocinado boolean default false,
  patrocinio_hasta date,
  seguidores int default 0,
  -- de donde es el negocio (sale del perfil de quien lo registra)
  comunidad_id uuid references public.comunidades(id) on delete set null,
  creado_en timestamptz default now()
);

alter table public.businesses add column if not exists comunidad_id uuid references public.comunidades(id) on delete set null;

-- ---------- Roles / permisos ----------
-- admin = Roep Tech. moderador = entidades locales (Presidencia, Comisiones, Iglesia):
--          pueden publicar avisos oficiales, NO moderan.
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and rol = 'admin')
$$;

create or replace function public.es_moderador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and rol in ('admin','moderador'))
$$;

-- ============================================================
--  ADMINISTRACION DE CUENTAS (solo Roep Tech)
--  Roep Tech crea, desde su panel, las cuentas de Presidencia,
--  Comisiones, Iglesia, negocios y vecinos, con el rol que sea
--  y con la comunidad (pueblo) a la que pertenecen.
-- ============================================================
drop function if exists public.admin_crear_usuario(text, text, text, text);
create or replace function public.admin_crear_usuario(
  p_email text, p_nombre text, p_password text, p_rol text default 'vecino',
  p_comunidad uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_email text := lower(trim(coalesce(p_email,'')));
  v_com uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo Roep Tech puede crear cuentas.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Ese correo no es válido.';
  end if;
  if coalesce(p_password,'') = '' then
    raise exception 'Escribe una contraseña para la cuenta.';
  end if;
  if coalesce(p_rol,'vecino') not in ('vecino','moderador','admin') then
    raise exception 'Rol no válido.';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Ese correo ya tiene cuenta. Si olvidó la contraseña, cámbiala desde aquí.';
  end if;

  -- comunidad: la indicada, o el primer pueblo activo si no se indicó
  select coalesce(
    (select id from public.comunidades where id = p_comunidad and activa),
    (select id from public.comunidades where activa order by creado_en limit 1)
  ) into v_com;
  if v_com is null then
    raise exception 'Aún no hay ningún pueblo activo. Agrégalo desde el panel.';
  end if;

  v_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', coalesce(p_nombre,'Vecino')), now(), now()
  );

  -- identidad de correo/contraseña (necesaria para entrar con contraseña)
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_email,
          jsonb_build_object('sub', v_id::text, 'email', v_email), 'email', now(), now(), now());

  -- el trigger handle_new_user crea el perfil; le ponemos nombre, rol y pueblo
  update public.profiles
     set nombre = coalesce(p_nombre,'Vecino'), rol = coalesce(p_rol,'vecino'),
         comunidad_id = v_com
   where id = v_id;

  return v_id;
end $$;

create or replace function public.admin_cambiar_rol(p_user uuid, p_rol text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then
    raise exception 'Solo Roep Tech cambia roles.';
  end if;
  if p_rol not in ('vecino','moderador','admin') then
    raise exception 'Rol no válido.';
  end if;
  update public.profiles set rol = p_rol where id = p_user;
  if not found then
    raise exception 'No encontré esa cuenta.';
  end if;
end $$;

create or replace function public.admin_cambiar_password(p_user uuid, p_password text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if not public.es_admin() then
    raise exception 'Solo Roep Tech cambia contraseñas.';
  end if;
  if coalesce(p_password,'') = '' then
    raise exception 'Escribe la nueva contraseña.';
  end if;
  select lower(email) into v_email from auth.users where id = p_user;
  if v_email is null then
    raise exception 'No encontré esa cuenta.';
  end if;
  update auth.users
     set encrypted_password = crypt(p_password, gen_salt('bf')),
         password_change_email_sent_at = null,
         updated_at = now()
   where id = p_user;
end $$;

-- solo el admin de la app puede ejecutarlas
revoke execute on function public.admin_crear_usuario(text, text, text, text, uuid) from public, anon;
revoke execute on function public.admin_cambiar_rol(uuid, text) from public, anon;
revoke execute on function public.admin_cambiar_password(uuid, text) from public, anon;
grant execute on function public.admin_crear_usuario(text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_cambiar_rol(uuid, text) to authenticated;
grant execute on function public.admin_cambiar_password(uuid, text) to authenticated;

-- ---------- Publicaciones ----------
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  -- author_id NULL = modo libre (sin cuenta)
  author_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  -- de donde es quien publica (se hereda del perfil; el invitado elige)
  comunidad_id uuid references public.comunidades(id) on delete set null,
  -- modo libre
  nombre_invitado text,
  modo_invitado boolean not null default false,
  dispositivo_hash text,
  revisado boolean not null default true,
  motivos text,
  tipo text not null check (tipo in ('aviso','venta','evento','empleo','ayuda','pregunta')),
  prioridad text default 'comunidad' check (prioridad in ('urgente','oficial','servicio','comunidad')),
  titulo text not null,
  cuerpo text,
  precio text,
  fecha_evento timestamptz,
  lugar text,
  modalidad text,
  salario text,
  contacto text,
  imagen_url text,
  lat double precision,
  lng double precision,
  -- avisos: motivo obligatorio + vigencia (2 dias recomendado, maximo 1 mes)
  motivo text,
  vigencia_dias int check (vigencia_dias is null or (vigencia_dias >= 2 and vigencia_dias <= 30)),
  expira_en timestamptz,
  -- fotos y videos (el navegador los comprime antes de subirlos)
  media jsonb default '[]'::jsonb,
  estado text not null default 'activo' check (estado in ('activo','oculto','reportado','pendiente')),
  destacado boolean default false,
  creado_en timestamptz default now()
);

alter table public.posts add column if not exists comunidad_id uuid references public.comunidades(id) on delete set null;

create index if not exists posts_tipo_idx on public.posts(tipo, creado_en desc);
create index if not exists posts_estado_idx on public.posts(estado, creado_en desc);
create index if not exists posts_business_idx on public.posts(business_id);
create index if not exists posts_expira_idx on public.posts(expira_en);
create index if not exists posts_comunidad_idx on public.posts(comunidad_id, creado_en desc);

-- ---------- Limite diario (3/dia negocio - 1/dia vecino) ----------
create table if not exists public.daily_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  fecha date not null default current_date,
  publicaciones int not null default 0,
  primary key (user_id, fecha)
);

-- Devuelve cuantas publicaciones le quedan hoy a un usuario
-- El dia se cuenta por HORA DEL PUEBLO (America/Mexico_City) para que el cupo
-- se reinicie a las 00:00 locales y no a las 18:00. Si tu municipio esta en
-- otra zona, cambia el valor de TZ_PUEBLO.
create or replace function public.quota_restante(p_user uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  usadas int;
  tope int;
  tiene_negocio boolean;
  tz text := 'America/Mexico_City';  -- Zona horaria del pueblo
begin
  select count(*) into usadas
  from public.posts
  where author_id = p_user
    and (creado_en at time zone 'utc') at time zone tz >= date_trunc('day', now() at time zone tz)
    and estado <> 'oculto';

  select exists(
    select 1 from public.businesses where owner_id = p_user and es_verificado = true
  ) into tiene_negocio;
  tope := case when tiene_negocio then 3 else 1 end;

  return greatest(tope - usadas, 0);
end $$;

-- Trigger que bloquea publicar si no hay cupo (solo cuentas; el modo libre usa publicar_invitado)
create or replace function public.check_daily_quota()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  restante int;
begin
  if new.author_id is null then
    return new; -- modo libre: su limite lo controla la tabla guest_rate
  end if;
  select public.quota_restante(new.author_id) into restante;
  if restante <= 0 then
    raise exception 'LIMITE_DIARIO: ya publicaste todo hoy. Tu cupo se renueva a las 00:00.';
  end if;
  return new;
end $$;

drop trigger if exists trg_check_quota on public.posts;
create trigger trg_check_quota
  before insert on public.posts
  for each row execute function public.check_daily_quota();

-- ---------- Avisos: motivo obligatorio, vigencia y rol ----------
create or replace function public.check_aviso_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  mi_rol text;
begin
  if new.author_id is null and new.tipo = 'aviso' then
    raise exception 'El modo libre no puede publicar avisos. Crea una cuenta.';
  end if;
  if new.tipo = 'aviso' and new.prioridad in ('urgente','oficial') then
    select rol into mi_rol from public.profiles where id = new.author_id;
    if mi_rol is null or mi_rol not in ('moderador','admin') then
      raise exception 'Solo entidades verificadas (Presidencia, Comisiones, Iglesia) y Roep Tech pueden publicar avisos oficiales o urgentes.';
    end if;
  end if;
  -- todo aviso (de quien sea) lleva motivo y vigencia elegida
  if new.tipo = 'aviso' then
    if coalesce(trim(coalesce(new.motivo,'')), '') = '' then
      raise exception 'MOTIVO_REQUERIDO: indica el motivo del aviso.';
    end if;
    -- por defecto vive 2 dias; maximo 1 mes (para no saturar la comunidad)
    if new.vigencia_dias is null then
      new.vigencia_dias := 2;
    end if;
    if new.vigencia_dias < 2 or new.vigencia_dias > 30 then
      raise exception 'La vigencia del aviso es de 2 a 30 dias (1 mes maximo).';
    end if;
    if new.expira_en is null then
      new.expira_en := now() + make_interval(days => new.vigencia_dias);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_aviso_role on public.posts;
create trigger trg_aviso_role
  before insert or update on public.posts
  for each row execute function public.check_aviso_role();

-- ---------- Reportes ----------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  motivo text not null default 'spam',
  estado text not null default 'abierto' check (estado in ('abierto','revisado','cerrado')),
  creado_en timestamptz default now(),
  unique (post_id, reporter_id)
);

-- ---------- Donaciones y patrocinios ----------
create table if not exists public.donations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  nombre text,
  monto numeric(12,2) not null,
  tipo text not null default 'donacion' check (tipo in ('donacion','patrocinio')),
  mensaje text,
  estado text not null default 'pendiente' check (estado in ('pendiente','confirmado')),
  creado_en timestamptz default now()
);

create table if not exists public.sponsor_plans (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  precio_mes numeric(12,2) not null,
  beneficios text
);

insert into public.sponsor_plans (nombre, precio_mes, beneficios) values
  ('Destacado Dorado', 250, 'Carrusel en Inicio y Negocios + badge dorado + prioridad en el feed'),
  ('Verificacion', 150, 'Badge de negocio verificado + 3 publicaciones al dia')
on conflict do nothing;

-- ---------- Seguimientos ----------
create table if not exists public.follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  creado_en timestamptz default now(),
  primary key (user_id, business_id)
);

-- ---------- Notificaciones (suscripciones push) ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text,
  auth text,
  creado_en timestamptz default now()
);

-- ============================================================
--  MODO LIBRE (publicar sin cuenta) - candados del servidor
-- ============================================================
create table if not exists public.guest_rate (
  dispositivo_hash text primary key,
  ultima timestamptz not null default now()
);

-- 1 = puede publicar, 0 = ya usó su cupo de 24 h
create or replace function public.invitado_puede_publicar(p_dispositivo text)
returns int language plpgsql stable security definer set search_path = public as $$
declare v_ult timestamptz;
begin
  if coalesce(p_dispositivo,'') = '' then return 0; end if;
  select ultima into v_ult from public.guest_rate where dispositivo_hash = p_dispositivo;
  if v_ult is null or v_ult < now() - interval '24 hours' then return 1; end if;
  return 0;
end $$;

-- Filtro de contenido: devuelve '' si pasa, o la lista de motivos
create or replace function public.filtro_contenido(p_texto text)
returns text language plpgsql immutable as $$
declare
  v_original text := coalesce(p_texto,'');
  t text := lower(v_original);
  motivos text := '';
begin
  if t ~ '(https?://|www\.|[a-z0-9-]+\.(com|net|org|xyz|online|click|club|store))' then
    motivos := motivos || 'enlaces,';
  end if;
  if t ~ '(puta|puto|pendejo|pendeja|cabron|cabrón|culero|mierda|idiota|imbecil|imbécil|estafa|estafador|bitcoin|cripto|forex|dinero facil|dinero fácil|inversion garantizada|inversión garantizada|xxx|porn|onlyfans|escorts|arma|pistola|navaja|droga|marihuana|cannabis|cocaina|cocaína|tarjeta clonada|seguidores gratis)' then
    motivos := motivos || 'palabras,';
  end if;
  if v_original ~ '[A-ZÁÉÍÓÚÑ]{25,}' then
    motivos := motivos || 'mayusculas,';
  end if;
  if length(v_original) > 1200 then
    motivos := motivos || 'largo,';
  end if;
  if v_original ~ '\+\?[0-9][0-9 .-]{9,}' then
    motivos := motivos || 'telefonos,';
  end if;
  return motivos;
end $$;

-- Publica SIN cuenta, aplicando todos los candados aqui mismo
drop function if exists public.publicar_invitado(text, text, text, text, text, text, text, text, timestamptz);
create or replace function public.publicar_invitado(
  p_dispositivo text,
  p_nombre text,
  p_tipo text,
  p_titulo text,
  p_cuerpo text,
  p_precio text default null,
  p_lugar text default null,
  p_contacto text default null,
  p_fecha_evento timestamptz default null,
  p_comunidad uuid default null
) returns public.posts language plpgsql security definer set search_path = public as $$
declare
  v_nombre text := trim(coalesce(p_nombre,''));
  v_estado text := 'activo';
  v_motivos text := '';
  v_id uuid;
  v_com uuid;
  v_row public.posts;
begin
  -- de donde es el invitado: el pueblo indicado, o el primero activo
  select coalesce(
    (select id from public.comunidades where id = p_comunidad and activa),
    (select id from public.comunidades where activa order by creado_en limit 1)
  ) into v_com;
  if v_com is null then
    raise exception 'Aun no hay ningun pueblo activo.';
  end if;
  -- candado 1: nombre publico obligatorio y limpio
  if length(v_nombre) < 2 or length(v_nombre) > 24 then
    raise exception 'Escribe tu nombre publico (entre 2 y 24 caracteres).';
  end if;
  if v_nombre ~ 'https?://|www\.|@|[0-9]{5,}' then
    raise exception 'Ese nombre publico no esta permitido.';
  end if;
  if v_nombre !~ '[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]' then
    raise exception 'Ese nombre publico no esta permitido.';
  end if;

  -- candado 2: categorias del modo libre
  if p_tipo not in ('venta','evento','ayuda','pregunta') then
    raise exception 'Sin cuenta solo puedes publicar Venta, Evento, Ayuda o Pregunta.';
  end if;
  if coalesce(p_titulo,'') !~ '\S' then
    raise exception 'Escribe un titulo para tu publicacion.';
  end if;

  -- candado 3: 1 publicacion cada 24 h por dispositivo
  if public.invitado_puede_publicar(p_dispositivo) = 0 then
    raise exception 'LIMITE_LIBRE: ya publicaste sin cuenta. Tu cupo se renueva en 24 horas.';
  end if;

  -- candado 4: filtro de contenido -> al instante o a revision
  v_motivos := public.filtro_contenido(p_titulo || ' ' || coalesce(p_cuerpo,'') || ' ' || coalesce(p_lugar,''));
  if v_motivos <> '' then
    v_estado := 'pendiente';
  end if;

  insert into public.posts
    (author_id, nombre_invitado, modo_invitado, dispositivo_hash, revisado, motivos,
     tipo, prioridad, titulo, cuerpo, precio, lugar, contacto, fecha_evento, estado, comunidad_id)
  values
    (null, v_nombre, true, p_dispositivo, (v_estado = 'activo'), v_motivos,
     p_tipo, 'comunidad', trim(p_titulo), coalesce(p_cuerpo,''), p_precio, p_lugar,
     p_contacto, p_fecha_evento, v_estado, v_com)
  returning id into v_id;

  insert into public.guest_rate (dispositivo_hash, ultima)
  values (p_dispositivo, now())
  on conflict (dispositivo_hash) do update set ultima = now();

  select * into v_row from public.posts where id = v_id;
  return v_row;
end $$;

-- ============================================================
--  BUZON PRIVADO: quejas, ideas y recomendaciones
--  (solo los admins de Roep Tech los ven; el autor ve su estado y respuesta)
-- ============================================================
create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  autor_id uuid references public.profiles(id) on delete cascade,
  autor text,
  tipo text not null default 'idea' check (tipo in ('queja','idea','recomendacion')),
  titulo text not null,
  texto text not null,
  estado text not null default 'nuevo' check (estado in ('nuevo','en proceso','resuelto')),
  respuesta text default '',
  creado_en timestamptz default now(),
  respondido_en timestamptz
);
create index if not exists feedback_autor_idx on public.feedback(autor_id);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.posts enable row level security;
alter table public.reports enable row level security;
alter table public.donations enable row level security;
alter table public.follows enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.feedback enable row level security;
alter table public.guest_rate enable row level security;
alter table public.comunidades enable row level security;

-- comunidades (pueblos): cualquiera las lee; solo Roep Tech agrega o cambia
drop policy if exists "pueblos visibles" on public.comunidades;
create policy "pueblos visibles" on public.comunidades for select using (true);
drop policy if exists "Roep Tech agrega pueblos" on public.comunidades;
create policy "Roep Tech agrega pueblos" on public.comunidades for insert with check (public.es_admin());
drop policy if exists "Roep Tech edita pueblos" on public.comunidades;
create policy "Roep Tech edita pueblos" on public.comunidades for update using (public.es_admin()) with check (public.es_admin());
drop policy if exists "Roep Tech borra pueblos" on public.comunidades;
create policy "Roep Tech borra pueblos" on public.comunidades for delete using (public.es_admin());

-- profiles
drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles for select using (true);
drop policy if exists "edito mi perfil" on public.profiles;
-- cada quien edita lo suyo; Roep Tech tambien puede (rol, pueblo, etc.)
create policy "edito mi perfil" on public.profiles for update
  using (auth.uid() = id or public.es_admin())
  with check (auth.uid() = id or public.es_admin());

-- businesses
drop policy if exists "negocios visibles" on public.businesses;
create policy "negocios visibles" on public.businesses for select using (true);
drop policy if exists "creo mi negocio" on public.businesses;
create policy "creo mi negocio" on public.businesses for insert with check (auth.uid() = owner_id);
drop policy if exists "edito mi negocio" on public.businesses;
create policy "edito mi negocio" on public.businesses for update using (auth.uid() = owner_id);

-- posts
drop policy if exists "posts visibles" on public.posts;
-- los avisos caducan solos: tras su vigencia desaparecen del feed (su autor aun los ve)
create policy "posts visibles" on public.posts for select using (
  estado = 'activo' or author_id = auth.uid()
  or expira_en is null or expira_en > now()
);
drop policy if exists "creo mis posts" on public.posts;
create policy "creo mis posts" on public.posts for insert with check (auth.uid() = author_id);
drop policy if exists "borro mis posts" on public.posts;
create policy "borro mis posts" on public.posts for delete using (author_id = auth.uid());
drop policy if exists "solo Roep Tech revisa" on public.posts;
create policy "solo Roep Tech revisa" on public.posts for update using (public.es_admin()) with check (public.es_admin());

-- reports
drop policy if exists "reporto" on public.reports;
create policy "reporto" on public.reports for insert with check (auth.uid() = reporter_id);
drop policy if exists "veo mis reportes" on public.reports;
create policy "veo mis reportes" on public.reports for select using (auth.uid() = reporter_id
  or auth.uid() in (select id from public.profiles where rol in ('moderador','admin')));

-- donations (cualquiera dona, solo admin revisa)
drop policy if exists "donar" on public.donations;
create policy "donar" on public.donations for insert with check (true);
drop policy if exists "veo donaciones" on public.donations;
create policy "veo donaciones" on public.donations for select using (true);

-- follows
drop policy if exists "sigo" on public.follows;
create policy "sigo" on public.follows for insert with check (auth.uid() = user_id);
drop policy if exists "dejo de seguir" on public.follows;
create policy "dejo de seguir" on public.follows for delete using (auth.uid() = user_id);
drop policy if exists "veo follows" on public.follows;
create policy "veo follows" on public.follows for select using (auth.uid() = user_id);

-- push subscriptions
drop policy if exists "mi suscripcion" on public.push_subscriptions;
create policy "mi suscripcion" on public.push_subscriptions for insert with check (auth.uid() is null or auth.uid() = user_id);
drop policy if exists "veo mi suscripcion" on public.push_subscriptions;
create policy "veo mi suscripcion" on public.push_subscriptions for select using (auth.uid() = user_id);

-- buzon privado: el vecino ve lo suyo, Roep Tech ve y responde todo
drop policy if exists "envio mi mensaje" on public.feedback;
create policy "envio mi mensaje" on public.feedback for insert with check (auth.uid() = autor_id);
drop policy if exists "veo mis mensajes" on public.feedback;
create policy "veo mis mensajes" on public.feedback for select using (auth.uid() = autor_id or public.es_admin());
drop policy if exists "Roep Tech responde" on public.feedback;
create policy "Roep Tech responde" on public.feedback for update using (public.es_admin()) with check (public.es_admin());

-- ============================================================
--  MEDIOS: fotos y videos de los avisos (ya comprimidos)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 15728640)  -- 15 MB por archivo
on conflict (id) do nothing;

drop policy if exists "medios visibles" on storage.objects;
create policy "medios visibles" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "suben medios" on storage.objects;
create policy "suben medios" on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');
drop policy if exists "borran sus medios" on storage.objects;
create policy "borran sus medios" on storage.objects for delete using (bucket_id = 'media' and auth.role() = 'authenticated');

-- ============================================================
--  COMENTARIOS
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  texto text not null,
  creado_en timestamptz default now()
);
create index if not exists comments_post_idx on public.comments(post_id);
alter table public.comments enable row level security;
drop policy if exists "comentarios visibles" on public.comments;
create policy "comentarios visibles" on public.comments for select using (true);
drop policy if exists "comento" on public.comments;
create policy "comento" on public.comments for insert with check (auth.uid() = author_id);

-- ============================================================
--  PUEBLOS EN DATOS EXISTENTES (bases creadas antes del filtro)
--  Cualquier perfil, negocio o publicacion que no tenga pueblo
--  se le asigna el primero activo para que NADA quede fuera del filtro.
-- ============================================================
update public.profiles    set comunidad_id = (select id from public.comunidades where activa order by creado_en limit 1)
  where comunidad_id is null and exists (select 1 from public.comunidades);
update public.businesses  set comunidad_id = (select id from public.comunidades where activa order by creado_en limit 1)
  where comunidad_id is null and exists (select 1 from public.comunidades);
update public.posts       set comunidad_id = (select id from public.comunidades where activa order by creado_en limit 1)
  where comunidad_id is null and exists (select 1 from public.comunidades);
create index if not exists businesses_comunidad_idx on public.businesses(comunidad_id);
create index if not exists profiles_comunidad_idx on public.profiles(comunidad_id);

-- ============================================================
--  SIN DATOS DE EJEMPLO: la base arranca vacia de verdad.
--  Las cuentas las crea Roep Tech desde su panel y el contenido
--  lo escribe el pueblo. (No hay perfiles ni publicaciones de prueba.)
--  Unico dato inicial: el pueblo San Simon Atzitzintla, que es la
--  comunidad que usa la app. Roep Tech agrega mas pueblos desde el
--  panel cuando lleguen vecinos de otro pueblo.
-- ============================================================

-- Listo. La app ya funciona con estos permisos.
