# El Pulso del Pueblo 🟢

**WebApp ElPDP · v1.0**

PWA comunitaria: todo lo que pasa en tu pueblo en un solo lugar.
Creado por **Roep Tech**.

---

## Qué hace

| Sección | Qué encuentras ahí |
|---|---|
| **Inicio** | Lo más reciente del pueblo + avisos urgentes + negocios patrocinadores |
| **Avisos** | Solo avisos oficiales y de la comunidad (con foto/video, motivo y vigencia) |
| **Negocios** | Directorio de negocios locales + **empleos** |
| **Publicar** | Venta, evento, ayuda, pregunta, empleo o aviso |
| **Mapa** | Negocios y eventos sobre el mapa |
| **Cuenta** | Tu perfil, notificaciones, donaciones, panel de Roep Tech |

Además:

- 🏘️ **Pueblos (comunidades)**: al registrarse se pregunta *¿De dónde eres?* y hay un filtro de pueblo en el encabezado. Roep Tech agrega más pueblos desde su panel.
- 🌤️ **Modo libre**: se puede ver todo y publicar sin cuenta (1 cada 24 h, nombre público obligatorio).
- 🔔 **Notificaciones web** (PWA): avisos urgentes y estado de tus publicaciones.
- 🛡️ **Moderación**: reportes, revisión de publicaciones sin cuenta y buzón privado para Roep Tech.
- ✦ **Patrocinios**: los negocios que apoyan la app quedan destacados en oro.

## Roles

- **admin** → Roep Tech (control total, crea cuentas y pueblos).
- **moderador** → Presidencia, Comisiones, Iglesia (solo publican avisos oficiales).
- **vecino** → todos los demás.

## Levantar el proyecto

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # compila a dist/
npm run smoke    # pruebas automáticas de las reglas del negocio
```

Sin `.env` la app corre en **modo demo** (datos en el navegador, solo para desarrollo).

## Estructura

```
src/
  pages/       Inicio, Avisos, Negocios, Publicar, Mapa, Cuenta, Login, PostDetalle
  components/  Header, FiltroPueblos, PostCard, UI
  lib/         api.js (datos), demo.js (modo demo), filtros, format, push, marca
  context/     AppContext (sesión, notificaciones, cupo, pueblos)
supabase/      schema.sql (tablas, permisos, límites y funciones)
scripts/       smoke.mjs (pruebas), gen-icons.mjs
```

## Stack

React 18 + Vite + Supabase (auth, base de datos, storage) · Leaflet para el mapa.

---

**Roep Tech** · [roeptech.com](https://roeptech.com)
