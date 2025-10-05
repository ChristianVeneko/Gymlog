# 🚀 Guía de Despliegue en Vercel - GymLog

## 📋 Pre-requisitos

1. **Cuenta de Vercel**: Crea una cuenta en [vercel.com](https://vercel.com)
2. **Base de datos Turso**: Asegúrate de tener tu base de datos activa en [turso.tech](https://turso.tech)
3. **API Keys**: Ten listas tus claves de Gemini AI y ExerciseDB

## 🔧 Paso 1: Preparar el Repositorio

### Opción A: Desde GitHub/GitLab/Bitbucket
```bash
# Inicializa git si no lo has hecho
git init
git add .
git commit -m "Preparar para producción"

# Sube a tu repositorio remoto
git remote add origin https://github.com/tu-usuario/gymlog.git
git push -u origin main
```

### Opción B: Deploy directo desde CLI
```bash
# Instala Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

## 🌍 Paso 2: Configurar Variables de Entorno en Vercel

Ve a tu proyecto en Vercel → Settings → Environment Variables y agrega:

### Variables Requeridas:

```bash
DATABASE_URL=libsql://gymlog-christianveneko.aws-us-east-2.turso.io
DATABASE_AUTH_TOKEN=tu-token-completo-de-turso

JWT_SECRET=tu-jwt-secret-seguro
JWT_REFRESH_SECRET=tu-jwt-refresh-secret-seguro

EXERCISEDB_API_URL=https://exercisedb-api-one.vercel.app
GEMINI_API_KEY=tu-api-key-de-gemini

NEXTAUTH_URL=https://tu-app.vercel.app
NEXTAUTH_SECRET=tu-nextauth-secret-seguro

NODE_ENV=production
```

### 🔐 Generar Secretos Seguros

Para JWT y NEXTAUTH secretos, genera claves seguras:

```bash
# En terminal:
openssl rand -base64 32
```

O usa: https://generate-secret.vercel.app/32

## 📦 Paso 3: Deploy desde Vercel Dashboard

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Selecciona "Import Git Repository"
3. Conecta tu repositorio de GitHub/GitLab
4. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
   - **Root Directory**: `./`

5. Agrega las variables de entorno (Paso 2)
6. Click en **Deploy** 🚀

## ✅ Paso 4: Verificación Post-Deploy

Una vez desplegado, verifica:

1. **Visita tu URL**: `https://tu-app.vercel.app`
2. **Prueba el login/registro**: Crea una cuenta
3. **Prueba crear una rutina**: Verifica la base de datos
4. **Prueba iniciar un entrenamiento**: Verifica funcionalidad completa
5. **Revisa los logs**: Vercel Dashboard → Deployments → Logs

## 🔄 Paso 5: Configurar Dominio Personalizado (Opcional)

1. Ve a tu proyecto → Settings → Domains
2. Agrega tu dominio personalizado
3. Configura DNS según las instrucciones de Vercel
4. **Actualiza NEXTAUTH_URL** con tu nuevo dominio

## 🐛 Troubleshooting

### Error: "DATABASE_URL is not defined"
- Verifica que las variables de entorno estén configuradas en Vercel
- Redespliega después de agregar variables

### Error 401 en API
- Verifica JWT_SECRET y JWT_REFRESH_SECRET
- Asegúrate que NEXTAUTH_SECRET esté configurado

### Error de conexión a Turso
- Verifica que DATABASE_AUTH_TOKEN sea correcto
- Revisa que la base de datos Turso esté activa

### Imágenes de ejercicios no cargan
- Verifica EXERCISEDB_API_URL
- Revisa configuración de `remotePatterns` en next.config.js

## 📊 Monitoreo

- **Logs en tiempo real**: `vercel logs tu-app.vercel.app`
- **Analytics**: Vercel Dashboard → Analytics
- **Performance**: Vercel Dashboard → Speed Insights

## 🔄 Deploy Automático

Una vez conectado a Git, cada push a `main` desplegará automáticamente:

```bash
git add .
git commit -m "Nueva funcionalidad"
git push origin main
# ✨ Vercel desplegará automáticamente
```

## 📱 Configurar PWA (Opcional)

Para que tu app sea instalable como PWA:

```bash
npm install next-pwa
```

Luego configura en `next.config.js` (instrucciones completas en documentación de next-pwa)

## 🎉 ¡Listo!

Tu app GymLog ahora está en producción. Comparte tu URL:
`https://tu-app.vercel.app`

---

## 📞 Soporte

- **Documentación Vercel**: https://vercel.com/docs
- **Documentación Next.js**: https://nextjs.org/docs
- **Turso Docs**: https://docs.turso.tech
