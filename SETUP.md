# DANA-IA — Guía de instalación

## Requisitos previos
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- Cuenta en [Anthropic](https://console.anthropic.com) (API key)
- Cuenta en [Vercel](https://vercel.com) para el despliegue
- Servidor SMTP o servicio de email (ej: Resend, Mailgun, SendGrid)

---

## 1. Clonar e instalar dependencias

```bash
cd dana-ia
npm install
```

---

## 2. Configurar Supabase

1. Crea un nuevo proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. En el SQL, cambia `admin@tuempresa.com` por el email real del administrador
4. Copia las credenciales desde **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales reales:

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AUTH_SECRET=genera-una-clave-aleatoria-de-32-chars
SMTP_HOST=smtp.tuempresa.com
SMTP_PORT=587
SMTP_USER=noreply@tuempresa.com
SMTP_PASS=tu-contraseña
SMTP_FROM=IA Corporativa <noreply@tuempresa.com>
NEXT_PUBLIC_APP_URL=https://ia.tuempresa.com
NEXT_PUBLIC_COMPANY_NAME=Mi Empresa
```

Para generar `AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Ejecutar en local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

El primer acceso: ve a `/auth/login`, introduce el email del administrador y recibirás el magic link.

---

## 5. Desplegar en Vercel

```bash
npm install -g vercel
vercel
```

O desde el dashboard de Vercel:
1. Importa el repositorio de GitHub
2. Añade todas las variables de entorno en **Project Settings → Environment Variables**
3. Actualiza `NEXT_PUBLIC_APP_URL` con tu dominio de Vercel

---

## Personalización

### Nombre de la empresa
Cambia `NEXT_PUBLIC_COMPANY_NAME` en las variables de entorno.

### Colores de marca
Edita `tailwind.config.ts` → `colors.brand` con los colores corporativos.

### Filtros de contenido
Edita `lib/content-filter.ts`:
- `PERSONAL_DATA_PATTERNS`: patrones regex de datos personales
- `HEALTH_KEYWORDS`: palabras clave de salud a bloquear
- `PERSONAL_TOPICS_KEYWORDS`: temas personales no permitidos

### System prompt de la IA
Edita `lib/anthropic.ts` → `CORPORATE_SYSTEM_PROMPT` para adaptar el comportamiento y restricciones de Claude a tu empresa.

---

## Cumplimiento RGPD

- **Sin almacenamiento de conversaciones**: los mensajes no se guardan en base de datos
- **Logs anonimizados**: solo se registra metadata (acción, timestamp, usuario_id)
- **Retención limitada**: los logs se pueden eliminar automáticamente tras 12 meses (ver `supabase/schema.sql`)
- **Filtros pre-procesamiento**: los mensajes se filtran ANTES de enviarse a la API de Anthropic
- **Acceso controlado**: solo usuarios invitados explícitamente por el administrador
- **Magic links**: sin contraseñas almacenadas, acceso por email verificado
