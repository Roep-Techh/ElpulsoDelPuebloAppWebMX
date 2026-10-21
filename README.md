# 💚 El Pulso del Pueblo

PWA comunitaria: **avisos, negocios, eventos, empleos y ayuda** de tu comunidad, organizados por secciones y con límite de publicaciones para que no se vuelva otro Facebook saturado.

> **Creado por Roep Tech** — [roeptech.com](https://roeptech.com)

---

## 🚀 Arrancar

```bash
npm install
npm run dev        # http://localhost:5173
```

**Modo demo (sin base de datos):** funciona desde el primer minuto con datos de ejemplo en `localStorage`. En la pantalla de login puedes entrar rápido como:

| Perfil | Correo | Clave | Rol |
|---|---|---|---|
| 💠 Roep Tech | `roep@pueblo.mx` | `demo1234` | **admin** (control total) |
| 🏛️ Presidencia | `admin@pueblo.mx` | `demo1234` | moderador (solo publica avisos) |
| ⛪ Iglesia | `iglesia@pueblo.mx` | `demo1234` | moderador |
| 💡 Comisiones | `comisiones@pueblo.mx` | `demo1234` | moderador |
| 🌮 Doña Lupita | `negocio@pueblo.mx` | `demo1234` | vecina con negocio verificado (3/día) |
| 👋 Carlos | `vecino@pueblo.mx` | `demo1234` | vecino (1/día) |

Clave de todos: `demo1234`

---

## 👥 Roles y permisos (`src/lib/permisos.js`)

| Permiso | 💠 admin (Roep Tech) | 🏛️ moderador (Presidencia, Comisiones, Iglesia) | 👤 vecino |
|---|:-:|:-:|:-:|
| Publicar avisos 🔴 urgentes / 🟢 oficiales | ✅ | ✅ | ❌ |
| Ocultar reportados y revisar invitados | ✅ | ❌ | ❌ |
| Ver buzón y responder | ✅ | ❌ | ❌ |
| Verificar negocios ✓ / patrocinios ✦ / roles | ✅ | ❌ | ❌ |

La presidencia **no modera**: solo publica avisos oficiales. Toda la revisión la hace Roep Tech desde
**Cuenta → 🛡️ Panel de Roep Tech**.

---

## 🏘️ Pueblos (comunidades): de dónde es cada quien

La app está pensada para **un pueblo por ahora — San Simón Atzitzintla — y para crecer** cuando otros
pueblos se interesen:

- **Al crear una cuenta se pregunta "¿De dónde eres?"** (Login → Crear cuenta) y esa respuesta queda en el
  perfil. En el **modo libre** (sin cuenta) también se pregunta antes de publicar.
- **Cada publicación, negocio y aviso lleva su pueblo**: hereda el del autor (o el que eligió el invitado).
  En las tarjetas se ve la etiqueta `📍 San Simón Atzitzintla`.
- **Hay un filtro de pueblo en el encabezado** (Selector "📍 Pueblo"). Con un solo pueblo solo aparece el
  tuyo; con varios, cada quien ve lo de su comunidad. La elección se guarda en el navegador.
- **Tú agregas más pueblos desde el panel**: **Cuenta → 🛡️ Panel de Roep Tech → 🏘️ Pueblos de la app**.
  Cuando lleguen, digamos, 10 vecinos de otro pueblo, lo agregas ahí y ya aparece en el filtro y en el
  registro de cuentas. También puedes **desactivar** un pueblo sin borrar su contenido.
- En el panel de **cuentas** puedes crear cuentas diciendo de dónde es cada una, y **mover una cuenta a
  otro pueblo** con el selector 📍 de cada fila.
- **Nadie más puede agregar pueblos**: en Supabase lo bloquea la política RLS de la tabla `comunidades`;
  en el modo demo, el permiso `admin`.

---

## 🌤️ Lectura pública y modo libre (sin cuenta)

- **Ver es libre**: Inicio, Negocios, Empleos, Avisos, Mapa y cada publicación se ven sin iniciar sesión.
- **Publicar sin cuenta** (modo libre) con 4 candados:
  1. **Nombre público obligatorio** (2–24 caracteres, sin links ni números).
  2. **1 publicación cada 24 h por dispositivo**.
  3. **Filtro automático** (`src/lib/filtros.js`): palabras prohibidas, enlaces, teléfonos y mayúsculas →
     si lo marca, el post queda **🕓 en revisión** en vez de salir.
  4. **Solo Venta, Evento, Ayuda y Pregunta** (avisos y empleos requieren cuenta).
- En Supabase todo eso se aplica en la función `publicar_invitado(...)` (security definer) + tabla `guest_rate`.
- **Comentar, reaccionar y reportar siempre requieren cuenta** (así no se llenan de spam).

---

## 📥 Buzón privado (quejas, ideas y recomendaciones)

- El vecino escribe desde **Cuenta → 📥 Quejas, ideas y recomendaciones**.
- **Es privado**: solo lo ve quien lo envió (con su estado y la respuesta) y Roep Tech.
- Roep Tech lo gestiona en **Cuenta → 🛡️ Panel de Roep Tech → 📥 Buzón**: responder, marcar *en proceso* o *resuelto*.
- Cuando se responde, al autor le llega una notificación in-app.

---

## 📢 Avisos: motivo, vigencia y medios

Reglas aplicadas a **cualquiera** que publique avisos (Presidencia, Comisiones, Iglesia, Roep Tech y vecinos con cuenta):

- **Motivo obligatorio** (`src/lib/tipos.js` → `MOTIVOS`): corte de agua, falta de luz, clima, mantenimiento,
  salud, evento oficial, seguridad, basura, agenda o *Otro*. El motivo se ve como etiqueta 📌 en el aviso.
- **Vigencia que elige quien publica** (`VIGENCIAS`): **2 días (⭐ recomendado y por defecto)**, 4 días,
  1 semana o 1 mes. Máximo 30 días. Al vencer, el aviso **desaparece solo** del feed (su autor aún lo ve en
  Cuenta → Mis publicaciones) para no saturar la comunidad.
- **Fotos y videos cortos** (`src/lib/media.js`):
  - Fotos: se redimensionan a **1280 px** y se pasan a **JPEG ~75%** en el propio celular.
  - Videos: se recortan a **20 segundos** y se recodifican a **720p / ~900 kbps** (webm). Si el navegador no
    puede recodificar, se acepta el original solo si dura 20 s o menos y pesa poco.
  - Máximo 5 archivos por aviso; en Supabase van al bucket `media` (15 MB por archivo).
  - Sin cuenta (modo libre) no se pueden subir archivos.

---

## 👑 De demo a datos reales (guía paso a paso)

### Paso 1 — Crea la base de datos (Supabase)

1. Entra a [supabase.com](https://supabase.com) → **New project** (el plan gratis alcanza sobrado).
   Elige la región más cercana (ej. *South America (São Paulo)* o *East US*) y guarda la **contraseña de la base**.
2. Abre **SQL Editor** → **New query** → pega **todo** el contenido de **`supabase/schema.sql`** → **Run**.
   Verás algo como *“Success. No rows returned”*: eso es todo bien. Se crean:
   tablas, permisos, el límite diario, el modo libre, el buzón, el filtro de avisos, el bucket de fotos/videos
   y el pueblo inicial **San Simón Atzitzintla** (los demás pueblos los agregas tú desde el panel).
3. **Authentication → Providers → Email** activado. En **Authentication → URL Configuration** pon la URL de la
   app (la de Vercel/Netlify) en *Site URL* y en *Redirect URLs*.

### Paso 2 — Tú quedas como el primer admin (Roep Tech)

1. En tu app, entra a **Login → Crear cuenta** con tu correo y una contraseña (esto crea tu cuenta como *vecino*;
   ahí mismo te pregunta **de dónde eres**, por defecto San Simón Atzitzintla).
2. Ve a **Supabase → Table Editor → profiles** → busca tu fila → cambia `rol` de `vecino` a **`admin`** → **Save**.
3. Sal y vuelve a entrar. Ya aparece **🛡️ Panel de Roep Tech** completo.

> Desde ese panel ya **tú creas las cuentas de Presidencia, Comisiones, Iglesia (rol moderador), de los negocios
> y de los vecinos que lo pidan**, con el correo y contraseña que tú elijas, y les cambias la contraseña si la
> olvidan. Nadie más puede crear cuentas con rol: la base de datos se lo impide.

### Paso 3 — Conecta la app

1. Copia `.env.example` a **`.env`** y llena tus datos (**Supabase → Project Settings → API**):

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_SITE_URL=https://tudominio.com
```

2. Reinicia `npm run dev`. La app **detecta Supabase sola** y sale del modo demo (ya no hay datos de ejemplo).

### Paso 4 — Subela a internet (Vercel o Netlify)

**Vercel** (el más fácil):

```bash
npm i -g vercel
vercel          # primera vez: sigue las preguntas, framework = Vite, build = npm run build, salida = dist
vercel --prod   # ya publicada
```

**Netlify**: arrastra la carpeta `dist/` a [app.netlify.com/drop](https://app.netlify.com/drop), o conecta tu
repositorio de GitHub con build `npm run build` y directorio `dist`.

En ambos casos, en **Settings → Environment Variables** agrega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y
`VITE_SITE_URL` (la URL pública). Después de cada cambio de variables, dale *Redeploy*.

### Paso 5 — Notificaciones push (opcional, requiere HTTPS)

1. Genera un par de claves VAPID: `npx web-push generate-vapid-keys`.
2. Pon la **pública** en `.env` como `VITE_VAPID_PUBLIC_KEY=...` y la **privada** guárdala segura.
3. En **Cuenta → Notificaciones → Activar notificaciones del navegador**.
4. Para disparar los avisos urgentes, usa la tabla `push_subscriptions` + `web-push` desde una Edge Function.

### Checklist antes de avisar al pueblo

- [ ] Entraste con tu cuenta admin y ves **🛡️ Panel de Roep Tech**.
- [ ] Creaste la cuenta de **Presidencia**, **Comisiones** e **Iglesia** (rol *moderador*) y publicaron un aviso de prueba.
- [ ] Registraste un negocio, lo verificaste (`✓`) desde el panel y comprobó que ya publica 3 veces al día.
- [ ] Publicaste un aviso con foto y video corto para ver que se comprimen.
- [ ] Probaron el **modo libre** (sin cuenta) y solo salen Venta/Evento/Ayuda/Pregunta.
- [ ] Alguien mandó una queja al **buzón** y le respondiste desde el panel.
- [ ] Agregaste el pueblo desde **Panel de Roep Tech → 🏘️ Pueblos** y apareció en el filtro y en el registro.
- [ ] Cambiaste `src/lib/marca.js` con el **enlace y contacto reales de Roep Tech** (sigue con datos de ejemplo).

### 🔒 La app compilada NO lleva datos de prueba

Para que nunca aparezcan perfiles ni publicaciones de ejemplo en la versión publicada:

- La **demo (localStorage)** solo existe en `npm run dev`. En `npm run build` queda **apagada**:
  no se siembra ningún usuario de ejemplo y las cadenas de prueba (`roep@pueblo.mx`, `demo1234`,
  etc.) **no se empaquetan** en `dist/`.
- Si subes el build **sin** conectar Supabase, la app no muestra inventos: aparece una pantalla que
  dice *“falta conectar la base de datos”* con las variables que faltan.
- En `supabase/schema.sql` **no hay datos de ejemplo**: la base arranca vacía. Las primeras cuentas
  las creas tú desde el panel; el contenido lo escribe el pueblo. El **único dato inicial** es el nombre
  del pueblo **San Simón Atzitzintla**, que es la comunidad que usa la app (no es un perfil ni una
  publicación de prueba).
- Solo quedan textos de ejemplo en las cajas de registro (placeholders como *“Ej. Presidencia
  Municipal”*), que son guías de escritura, no datos.

---

## 🔔 Notificaciones push

1. Sube la app a un hosting con HTTPS (Vercel/Netlify) — el push no funciona en `http://localhost` salvo en dev.
2. Genera un par de claves VAPID (por ejemplo con `npx web-push generate-vapid-keys`) y pon la pública en `.env`:
   `VITE_VAPID_PUBLIC_KEY=...`
3. En **Cuenta → Notificaciones → Activar notificaciones del navegador**.
4. Para enviarlas, guarda la suscripción (ya se guarda en la tabla `push_subscriptions`) y dispara el push con `web-push` desde una Edge Function de Supabase cuando haya un **aviso urgente/oficial** o actividad en lo que el usuario sigue.

---

## 📦 Construir para producción

```bash
npm run build     # genera dist/
npm run preview   # probar el build
npm run smoke     # 110+ pruebas de las reglas del negocio
```

Sube `dist/` a Vercel o Netlify (o usa `vercel` como arriba). Recuerda configurar las variables de entorno
`.env` **también en el hosting**, no solo en tu compu.

---

## 🧭 Estructura

```
supabase/schema.sql     Esquema completo + comunidades + RLS + triggers de cupo + publicar_invitado + buzon
scripts/gen-icons.mjs   Genera los iconos PNG de la PWA (npm run icons)
scripts/smoke.mjs       Pruebas automaticas (npm run smoke)
public/sw.js            Service worker: caché + web push
src/lib/api.js          Puerta única de datos (Supabase o demo)
src/lib/demo.js         Modo demostración en localStorage
src/lib/permisos.js     ✏️ Roles: admin / moderador / vecino
src/lib/filtros.js      ✏️ Filtros de contenido y reglas del modo libre
src/lib/media.js        Compresión de fotos (1280 px) y videos (20 s / 720p)
src/lib/tipos.js        ✏️ Tipos de publicación, motivos, vigencias y rubros
src/lib/marca.js        ✏️ Tu marca: Roep Tech, enlaces, contactos y planes
src/components/Media.jsx  Selector (con compresión) y visor de fotos/videos
src/pages/              Inicio · Negocios · Publicar · Avisos · Cuenta · Mapa · detalles
src/components/         Header, BottomNav, PostCard y piezas de UI
```

---

## ✏️ Personalizar

- **Datos de contacto de Roep Tech, planes y meta de donaciones:** `src/lib/marca.js`
- **Colores y tema:** variables en `src/styles.css` (`:root`)
- **Ubicación central del mapa:** constante `CENTRO` en `src/pages/Mapa.jsx`
- **Reglas de publicación:** `TOPE_NEGOCIO` / `TOPE_VECINO` en `src/lib/tipos.js` y la función `quota_restante` en `supabase/schema.sql`
