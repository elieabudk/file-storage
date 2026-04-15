# 📁 FileVault — Sistema de gestión de archivos

Sistema de gestión de archivos seguro con autenticación, almacenamiento en la nube y acceso controlado por usuario. Cada usuario solo puede ver y gestionar sus propios archivos.

🌐 **Demo:** [https://d1mbsf2ysinvol.cloudfront.net](https://d1mbsf2ysinvol.cloudfront.net)

---

## ✨ Funcionalidades

- Autenticación segura con AWS Cognito
- Subida de archivos por clic o drag & drop
- Vista previa de imágenes directamente en la interfaz
- Descarga de archivos mediante URLs temporales firmadas
- Eliminación de archivos (S3 + base de datos)
- Sesión persistente con cookies HttpOnly
- Cada usuario solo accede a sus propios archivos

---

## 🏗️ Arquitectura

```
Usuario
   │
   ▼
CloudFront (HTTPS)
   │
   ├──► S3 (Frontend — privado, solo CloudFront accede)
   │
   └──► API Gateway
              │
              ▼
         Lambda (Node.js + Express)
         │         │           │
         ▼         ▼           ▼
      Cognito     RDS        S3
    (Auth JWT) (Metadatos) (Archivos)
```

### Flujo de autenticación

```
1. Usuario introduce email y contraseña
2. Lambda llama a Cognito → devuelve token JWT
3. Lambda guarda el token en una cookie HttpOnly
4. El navegador envía la cookie automáticamente en cada petición
5. Lambda verifica el token con las claves públicas de Cognito
```

### Flujo de subida de archivos

```
1. Frontend pide URL presignada a Lambda
2. Lambda genera URL temporal de S3 (válida 5 minutos)
3. Frontend sube el archivo DIRECTAMENTE a S3
4. Frontend notifica a Lambda que la subida fue exitosa
5. Lambda guarda los metadatos en RDS
```

### Flujo de descarga

```
1. Frontend pide URL de descarga a Lambda
2. Lambda verifica que el archivo pertenece al usuario
3. Lambda genera URL temporal de S3 (válida 5 minutos)
4. Frontend descarga directamente desde S3
```

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| Node.js 20 | Runtime del servidor |
| Express.js | Framework HTTP |
| serverless-http | Adapta Express a Lambda |
| AWS Lambda | Ejecución del código serverless |
| AWS API Gateway | Entrada HTTP a Lambda |
| AWS Cognito | Autenticación y gestión de usuarios |
| AWS RDS (PostgreSQL) | Metadatos de archivos |
| AWS S3 | Almacenamiento de archivos |
| AWS CloudFront | CDN con HTTPS |
| Serverless Framework v3 | Deploy automatizado |
| jose | Verificación de tokens JWT |
| cookie-parser | Gestión de cookies HttpOnly |
| pg | Cliente PostgreSQL para Node.js |

---

## 🔒 Seguridad

- **Cookie HttpOnly** — el token JWT no es accesible desde JavaScript. Protege contra ataques XSS.
- **JWT firmado por Cognito** — verificado con RS256 contra las claves públicas de Cognito. No se puede falsificar.
- **CORS restringido** — solo acepta peticiones desde el dominio del frontend.
- **Archivos privados en S3** — el bucket no es público. Solo se accede mediante URLs presignadas que expiran en 5 minutos.
- **Aislamiento por usuario** — cada query filtra por `user_id`. Un usuario nunca puede acceder a los archivos de otro.
- **HTTPS obligatorio** — CloudFront fuerza HTTPS en todas las peticiones.
- **Cookies seguras en producción** — `secure: true` y `sameSite: none` en producción.

---

## 📁 Estructura del proyecto

```
file-manager/
├── src/
│   ├── handlers/
│   │   ├── auth/
│   │   │   └── login.js           # POST /auth/login
│   │   └── files/
│   │       ├── getUploadUrl.js    # POST /files/upload-url
│   │       ├── saveFile.js        # POST /files
│   │       ├── listFiles.js       # GET /files
│   │       ├── getDownloadUrl.js  # GET /files/:id/download
│   │       └── deleteFile.js      # DELETE /files/:id
│   ├── middleware/
│   │   └── auth.js                # Verificación JWT con jose
│   ├── db/
│   │   ├── postgres.js            # Conexión a RDS
│   │   └── migrate.js             # Creación de tablas
│   ├── app.js                     # Entry point Lambda
│   └── server.js                  # Servidor local para desarrollo
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example                   # Variables de entorno necesarias
├── serverless.yml.example         # Configuración de deploy
├── .gitignore
└── package.json
```

---

## 📡 Endpoints de la API

### `POST /auth/login`

Inicia sesión y establece una cookie HttpOnly con el token JWT.

**Request:**
```json
{
  "email": "usuario@email.com",
  "password": "contraseña"
}
```

**Response 200:**
```json
{
  "message": "Login exitoso",
  "email": "usuario@email.com"
}
```

---

### `POST /auth/logout`

Elimina la cookie de sesión.

**Response 200:**
```json
{
  "message": "Sesión cerrada"
}
```

---

### `GET /auth/me` 🔒

Devuelve el email del usuario autenticado.

**Response 200:**
```json
{
  "email": "usuario@email.com"
}
```

---

### `GET /files` 🔒

Lista todos los archivos del usuario autenticado.

**Response 200:**
```json
{
  "files": [
    {
      "id": "uuid",
      "file_name": "documento.pdf",
      "file_type": "application/pdf",
      "file_size": 12345,
      "s3_key": "user-id/file-id/documento.pdf",
      "created_at": "2026-04-15T10:00:00.000Z"
    }
  ]
}
```

---

### `POST /files/upload-url` 🔒

Genera una URL presignada de S3 para subir un archivo directamente.

**Request:**
```json
{
  "fileName": "documento.pdf",
  "fileType": "application/pdf"
}
```

**Response 200:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "fileId": "uuid",
  "s3Key": "user-id/file-id/documento.pdf"
}
```

---

### `POST /files` 🔒

Guarda los metadatos de un archivo después de subirlo a S3.

**Request:**
```json
{
  "fileName": "documento.pdf",
  "fileType": "application/pdf",
  "fileSize": 12345,
  "s3Key": "user-id/file-id/documento.pdf"
}
```

**Response 201:**
```json
{
  "file": {
    "id": "uuid",
    "file_name": "documento.pdf",
    "created_at": "2026-04-15T10:00:00.000Z"
  }
}
```

---

### `GET /files/:id/download` 🔒

Genera una URL presignada de S3 para descargar un archivo.

**Response 200:**
```json
{
  "downloadUrl": "https://s3.amazonaws.com/...",
  "fileName": "documento.pdf"
}
```

---

### `DELETE /files/:id` 🔒

Elimina un archivo de S3 y sus metadatos de RDS.

**Response 200:**
```json
{
  "message": "Archivo eliminado correctamente"
}
```

> 🔒 Todos los endpoints marcados requieren cookie de sesión válida.

---

## 🚀 Instalación local

### Requisitos previos

- Node.js 20 o superior
- Cuenta de AWS con credenciales configuradas
- AWS CLI instalado
- PostgreSQL instalado localmente

### 1. Clona el repositorio

```bash
git clone https://github.com/TU-USUARIO/file-manager.git
cd file-manager
```

### 2. Instala las dependencias

```bash
npm install
```

### 3. Configura las variables de entorno

```bash
cp .env.example .env
```

Rellena los valores en el `.env` con tus recursos de AWS.

### 4. Crea los recursos en AWS

- User Pool en Cognito con un App Client
- Bucket S3 con CORS configurado
- Base de datos RDS PostgreSQL
- Usuario en Cognito para hacer login

### 5. Configura el CORS en S3

En tu bucket S3 → pestaña `Permissions` → `CORS`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 6. Ejecuta la migración

```bash
node src/db/migrate.js
```

### 7. Arranca el servidor local

```bash
node src/server.js
```

El servidor estará disponible en `http://localhost:3000`.

---

## ☁️ Deploy en AWS

### 1. Copia el serverless.yml de ejemplo

```bash
cp serverless.yml.example serverless.yml
```

### 2. Despliega el backend

```bash
npx serverless deploy
```

### 3. Ejecuta la migración en producción

```bash
npx serverless invoke --function migrate
```

### 4. Actualiza el frontend

En `frontend/app.js` cambia:

```js
const API_URL = 'https://TU-URL-API-GATEWAY.execute-api.eu-west-3.amazonaws.com/dev'
```

### 5. Despliega el frontend

- Crea un bucket S3 privado para el frontend
- Sube los 3 archivos de la carpeta `frontend/`
- Crea una distribución CloudFront apuntando al bucket
- Añade `index.html` como `Default root object`

---

## 🗄️ Esquema de base de datos

```sql
CREATE TABLE files (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     VARCHAR(255) NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_type   VARCHAR(100) NOT NULL,
  file_size   INTEGER NOT NULL,
  s3_key      VARCHAR(500) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Variables de entorno

| Variable | Descripción |
|---|---|
| `COGNITO_USER_POOL_ID` | ID del User Pool de Cognito |
| `COGNITO_CLIENT_ID` | ID del App Client de Cognito |
| `COGNITO_REGION` | Región de AWS donde está Cognito |
| `S3_BUCKET` | Nombre del bucket S3 para archivos |
| `S3_REGION` | Región de AWS donde está S3 |
| `DB_HOST` | Endpoint de la base de datos RDS |
| `DB_PORT` | Puerto de PostgreSQL (5432) |
| `DB_NAME` | Nombre de la base de datos |
| `DB_USER` | Usuario de la base de datos |
| `DB_PASSWORD` | Contraseña de la base de datos |

---

## 📝 Licencia

MIT
