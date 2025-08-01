# SplashMy Backend - Documentación Completa

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Aplicaciones del Backend](#aplicaciones-del-backend)
4. [Flujos de Usuario](#flujos-de-usuario)
5. [Configuración y Variables de Entorno](#configuración-y-variables-de-entorno)
6. [API Endpoints](#api-endpoints)
7. [Integración con Servicios Externos](#integración-con-servicios-externos)
8. [Tareas Asíncronas (Celery)](#tareas-asíncronas-celery)
9. [Base de Datos](#base-de-datos)
10. [Deployment](#deployment)

---

## 🎯 Visión General

**SplashMy** es una plataforma de transformación de imágenes que utiliza **OpenAI GPT-Image-1** para generar, editar y aplicar estilos a imágenes. El backend está construido con **Django REST Framework** y proporciona una API completa para la gestión de usuarios, imágenes, estilos y procesamiento asíncrono.

### Características Principales

- 🖼️ **Gestión de Imágenes**: Subida, almacenamiento (S3/local), moderación de contenido
- 🎨 **Sistema de Estilos**: Catálogo organizado de estilos de transformación
- 🤖 **Procesamiento con IA**: Integración completa con OpenAI para generación/edición
- 👥 **Gestión de Usuarios**: Autenticación, perfiles, cuotas diarias/premium
- 📊 **Analytics**: Estadísticas de uso, ratings, favoritos
- ⚡ **Procesamiento Asíncrono**: Cola de trabajos con Celery/Redis
- 🛡️ **Moderación de Contenido**: Amazon Rekognition para seguridad

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │◄──►│   Django API    │◄──►│   PostgreSQL    │
│   (Next.js)     │    │  (REST Framework)│    │   / MySQL DB    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌────────┼────────┐
                       ▼        ▼        ▼
              ┌─────────────┐ ┌──────┐ ┌─────────────┐
              │   Celery    │ │Redis │ │    AWS      │
              │  Workers    │ │Queue │ │ S3/Rekognition│
              └─────────────┘ └──────┘ └─────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   OpenAI API    │
              │  (GPT-Image-1)  │
              └─────────────────┘
```

### Stack Tecnológico

- **Framework**: Django 4.x + Django REST Framework
- **Base de Datos**: MySQL (configurable PostgreSQL)
- **Cola de Tareas**: Celery + Redis
- **Almacenamiento**: AWS S3 (con fallback local)
- **Autenticación**: Token-based authentication
- **IA**: OpenAI GPT-Image-1
- **Moderación**: Amazon Rekognition
- **Contenedorización**: Docker + Docker Compose

---

## 📱 Aplicaciones del Backend

### 1. **`config/`** - Configuración Principal

#### Archivos Principales:
- **`settings.py`**: Configuración Django completa con variables de entorno
- **`urls.py`**: URLs raíz que incluyen todas las aplicaciones
- **`celery.py`**: Configuración de Celery con tareas periódicas

#### Configuraciones Clave:
```python
# Aplicaciones locales
LOCAL_APPS = [
    'apps.users',      # Gestión de usuarios
    'apps.images',     # Gestión de imágenes
    'apps.styles',     # Catálogo de estilos
    'apps.processing', # Procesamiento IA
]

# Rutas API principales
/api/v1/auth/       # Autenticación
/api/v1/images/     # Gestión de imágenes
/api/v1/styles/     # Catálogo de estilos
/api/v1/processing/ # Trabajos de procesamiento
```

---

### 2. **`apps.users`** - Gestión de Usuarios

#### Modelos:
- **`User`**: Modelo de usuario extendido con campos adicionales
- **`UserProfile`**: Perfil adicional del usuario con preferencias

#### Características:
- Email como campo de autenticación principal
- Gestión de usuarios premium vs gratuitos
- Contador de procesamiento para cuotas
- Sistema de perfiles con preferencias de estilos

#### Endpoints:
```
POST   /api/v1/auth/register/           # Registro de usuario
POST   /api/v1/auth/login/              # Login
POST   /api/v1/auth/logout/             # Logout
GET    /api/v1/auth/profile/            # Perfil del usuario
PUT    /api/v1/auth/profile/            # Actualizar perfil
GET    /api/v1/auth/profile/details/    # Detalles del perfil
POST   /api/v1/auth/change-password/    # Cambiar contraseña
```

#### Flujo de Autenticación:
1. Usuario se registra con email/username/password
2. Se crea automáticamente un `UserProfile` asociado
3. Se genera un token de autenticación
4. El token se usa para todas las requests autenticadas

---

### 3. **`apps.images`** - Gestión de Imágenes

#### Modelos:
- **`Image`**: Imagen original subida por el usuario
- **`ProcessedImage`**: Versiones procesadas/estilizadas
- **`ImageTag`**: Tags para categorizar imágenes
- **`ImageTagAssignment`**: Relación many-to-many entre imágenes y tags

#### Servicios (`services.py`):
- **`AWSImageService`**: Manejo de S3, Rekognition y almacenamiento local
- **`ImageProcessingService`**: Optimización y extracción de metadatos

#### Funcionalidades:
- Subida con validación de formato y tamaño
- Moderación automática de contenido (Amazon Rekognition)
- Almacenamiento dual (S3 producción / local desarrollo)
- Sistema de tags manual y automático
- Generación de URLs firmadas para acceso seguro
- Límites diarios de subida (gratuitos vs premium)

#### Endpoints:
```
POST   /api/v1/images/upload/                    # Subir imagen
GET    /api/v1/images/                           # Listar imágenes del usuario
GET    /api/v1/images/<uuid>/                    # Detalle de imagen
PUT    /api/v1/images/<uuid>/                    # Actualizar imagen
DELETE /api/v1/images/<uuid>/                    # Eliminar imagen
GET    /api/v1/images/public/                    # Imágenes públicas
GET    /api/v1/images/processed/                 # Imágenes procesadas
GET    /api/v1/images/processed/<uuid>/          # Detalle procesada
POST   /api/v1/images/processed/<uuid>/favorite/ # Marcar favorita
POST   /api/v1/images/processed/<uuid>/rate/     # Valorar imagen
GET    /api/v1/images/<uuid>/download/           # Descargar imagen
GET    /api/v1/images/tags/                      # Listar tags
GET    /api/v1/images/stats/                     # Estadísticas del usuario
```

#### Flujo de Subida de Imagen:
1. Usuario selecciona imagen en frontend
2. Validación de formato/tamaño en serializer
3. Verificación de cuota diaria del usuario
4. Optimización automática de la imagen
5. Moderación de contenido con Rekognition
6. Subida a S3 (o almacenamiento local)
7. Creación del registro en base de datos
8. Asignación de tags si se proporcionan

---

### 4. **`apps.styles`** - Catálogo de Estilos

#### Modelos:
- **`StyleCategory`**: Categorías de estilos (Anime, Cartoon, Art, etc.)
- **`Style`**: Estilos individuales con plantillas de prompt
- **`StyleExample`**: Ejemplos visuales de cada estilo
- **`UserStylePreference`**: Preferencias y favoritos del usuario
- **`StyleRating`**: Valoraciones de estilos por usuarios

#### Funcionalidades:
- Catálogo organizado por categorías
- Plantillas de prompt para OpenAI
- Sistema de ejemplos visuales
- Preferencias personalizadas por usuario
- Sistema de rating y popularidad
- Configuración de parámetros por estilo

#### Endpoints:
```
GET    /api/v1/styles/categories/              # Categorías de estilos
GET    /api/v1/styles/                         # Listar estilos
GET    /api/v1/styles/<uuid>/                  # Detalle de estilo
GET    /api/v1/styles/popular/                 # Estilos populares
GET    /api/v1/styles/preferences/             # Preferencias del usuario
POST   /api/v1/styles/<uuid>/favorite/         # Marcar favorito
POST   /api/v1/styles/<uuid>/rate/             # Valorar estilo
GET    /api/v1/styles/<uuid>/examples/         # Ejemplos del estilo
```

#### Configuración de Estilo:
```python
# Ejemplo de estilo
{
    "name": "Anime Portrait",
    "category": "Anime",
    "prompt_template": "Transform this image into {style_name} style: {original_prompt}",
    "default_quality": "high",
    "default_background": "auto",
    "default_output_format": "png",
    "supports_transparency": True,
    "is_premium": False
}
```

---

### 5. **`apps.processing`** - Procesamiento con IA

#### Modelos:
- **`ProcessingJob`**: Trabajos de procesamiento de imágenes
- **`ProcessingResult`**: Resultados del procesamiento
- **`StreamingEvent`**: Eventos de streaming en tiempo real
- **`UserProcessingQuota`**: Cuotas diarias de procesamiento
- **`ProcessingTemplate`**: Plantillas preconfiguradas

#### Servicios (`services.py`):
- **`OpenAIImageService`**: Integración completa con OpenAI GPT-Image-1

#### Tareas Asíncronas (`tasks.py`):
- **`process_image_job_async`**: Procesamiento principal asíncrono
- **`cleanup_old_jobs`**: Limpieza periódica de trabajos antiguos
- **`update_processing_stats`**: Actualización de estadísticas

#### Tipos de Procesamiento:
1. **Generation**: Generación de imágenes desde texto
2. **Edit**: Edición de imágenes existentes
3. **Style Transfer**: Aplicación de estilos específicos

#### Endpoints:
```
POST   /api/v1/processing/jobs/                    # Crear trabajo
GET    /api/v1/processing/jobs/list/               # Listar trabajos
GET    /api/v1/processing/jobs/<uuid>/             # Detalle de trabajo
POST   /api/v1/processing/jobs/<uuid>/cancel/      # Cancelar trabajo
GET    /api/v1/processing/results/                 # Resultados del usuario
POST   /api/v1/processing/results/<uuid>/favorite/ # Marcar favorito
POST   /api/v1/processing/results/<uuid>/rate/     # Valorar resultado
GET    /api/v1/processing/results/<uuid>/download/ # Descargar resultado
GET    /api/v1/processing/quota/                   # Cuota del usuario
GET    /api/v1/processing/stats/                   # Estadísticas
GET    /api/v1/processing/templates/               # Plantillas
```

#### Flujo de Procesamiento:
1. Usuario crea trabajo de procesamiento
2. Validación de cuota y parámetros
3. Creación del `ProcessingJob` en estado "pending"
4. Envío a cola Celery para procesamiento asíncrono
5. Worker Celery procesa el trabajo:
   - Carga imagen si es necesaria
   - Moderación de contenido
   - Llamada a OpenAI GPT-Image-1
   - Procesamiento de respuesta
   - Subida de resultados a S3
   - Creación de `ProcessingResult`
6. Actualización de estado del trabajo
7. Incremento de cuota del usuario

---

## 🚀 Flujos de Usuario

### 1. **Registro y Autenticación**
```
Usuario → Registro → Creación UserProfile → Login → Token → Acceso API
```

### 2. **Subida de Imagen**
```
Selección Imagen → Validación → Optimización → Moderación → S3 → BD
```

### 3. **Procesamiento de Imagen**
```
Selección Estilo → Configuración → Validación Cuota → Cola Celery → OpenAI → Resultado
```

### 4. **Descarga de Resultado**
```
Selección Resultado → URL Firmada → Descarga → Incremento Contador
```

---

## ⚙️ Configuración y Variables de Entorno

### Archivo `.env` Requerido:

```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ENVIRONMENT=development

# Base de datos
DATABASE_NAME=splashmy_db
DATABASE_USER=splashmy_user
DATABASE_PASSWORD=splashmy_password
DATABASE_HOST=mysql
DATABASE_PORT=3306

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# AWS (Producción)
USE_S3_STORAGE=False
USE_CONTENT_MODERATION=False
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=splashmy-bucket
AWS_S3_REGION_NAME=us-east-1
AWS_REKOGNITION_REGION=us-east-1

# Celery
CELERY_BROKER_URL=redis://redis:6379
CELERY_RESULT_BACKEND=redis://redis:6379

# Límites
MAX_UPLOAD_SIZE=10485760
DAILY_UPLOAD_LIMIT_FREE=10
DAILY_UPLOAD_LIMIT_PREMIUM=100
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,gif,webp
```

### Configuración por Ambiente:

#### Desarrollo:
- `USE_S3_STORAGE=False` (almacenamiento local)
- `USE_CONTENT_MODERATION=False` (sin moderación)
- `DEBUG=True`

#### Producción:
- `USE_S3_STORAGE=True` (AWS S3)
- `USE_CONTENT_MODERATION=True` (Amazon Rekognition)
- `DEBUG=False`

---

## 🔗 API Endpoints

### Estructura de URLs:
```
/api/v1/
├── auth/                   # Autenticación (users app)
├── images/                 # Gestión de imágenes
├── styles/                 # Catálogo de estilos
└── processing/             # Trabajos de procesamiento
```

### Autenticación:
Todas las requests autenticadas requieren header:
```
Authorization: Token <user-token>
```

### Respuestas API:
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed",
  "pagination": {
    "count": 100,
    "next": "http://api/resource/?page=2",
    "previous": null,
    "results": [...]
  }
}
```

---

## 🌐 Integración con Servicios Externos

### 1. **OpenAI GPT-Image-1**
- **Uso**: Generación, edición y transformación de imágenes
- **Configuración**: API key en variable de entorno
- **Parámetros soportados**:
  - `quality`: auto, low, medium, high
  - `background`: auto, transparent, opaque
  - `output_format`: png, jpeg, webp
  - `size`: auto, 1024x1024, 1536x1024, 1024x1536
  - `stream`: streaming en tiempo real

### 2. **Amazon S3**
- **Uso**: Almacenamiento de imágenes originales y procesadas
- **Configuración**: Credenciales AWS en variables de entorno
- **Estructura de buckets**:
  ```
  /images/uploads/<user_id>/<image_id>.jpg
  /processed/<user_id>/<date>/<uuid>.png
  ```

### 3. **Amazon Rekognition**
- **Uso**: Moderación automática de contenido
- **Configuración**: Credenciales AWS + región
- **Threshold**: Configurable (por defecto 80% confianza)

---

## ⚡ Tareas Asíncronas (Celery)

### Workers Configurados:
```bash
# Iniciar worker
celery -A config worker -l info

# Iniciar beat (tareas periódicas)
celery -A config beat -l info

# Monitoreo
celery -A config flower
```

### Tareas Periódicas:
- **`cleanup_old_jobs`**: Cada hora - elimina trabajos antiguos
- **`update_processing_stats`**: Cada 30 minutos - actualiza estadísticas

### Tareas Principales:
- **`process_image_job_async`**: Procesamiento principal de imágenes
- **`send_job_notification`**: Notificaciones de estado

---

## 🗄️ Base de Datos

### Esquema Principal:

```sql
-- Usuarios
users (id, email, username, is_premium, processing_count, ...)
user_profiles (user_id, bio, preferred_styles, max_daily_processes, ...)

-- Imágenes
images (id, user_id, title, s3_key, s3_url, is_content_safe, ...)
processed_images (id, original_image_id, user_id, style_name, ...)
image_tags (id, name, slug, description, ...)
image_tag_assignments (image_id, tag_id, confidence, ...)

-- Estilos
style_categories (id, name, slug, icon, color, ...)
styles (id, category_id, name, prompt_template, is_premium, ...)
style_examples (id, style_id, original_image_url, styled_image_url, ...)
user_style_preferences (user_id, style_id, is_favorite, usage_count, ...)
style_ratings (user_id, style_id, rating, comment, ...)

-- Procesamiento
processing_jobs (id, user_id, job_type, status, prompt, ...)
processing_results (id, job_id, result_b64, s3_key, s3_url, ...)
streaming_events (id, job_id, event_type, b64_data, ...)
user_processing_quotas (user_id, daily_generations, daily_edits, ...)
processing_templates (id, name, job_type, default_parameters, ...)
```

### Migraciones:
```bash
python manage.py makemigrations
python manage.py migrate
```

---

## 🚀 Deployment

### Con Docker Compose:
```bash
# Desarrollo
docker-compose up -d

# Producción
docker-compose -f docker-compose.prod.yml up -d
```

### Servicios Requeridos:
- **MySQL**: Base de datos principal
- **Redis**: Cola de tareas y cache
- **Celery Worker**: Procesamiento asíncrono
- **Celery Beat**: Tareas periódicas

### Variables de Entorno Críticas:
- `OPENAI_API_KEY`: Requerida para funcionalidad principal
- `DATABASE_*`: Configuración de base de datos
- `CELERY_*`: Configuración de cola de tareas
- `AWS_*`: Para almacenamiento y moderación en producción

### Comandos Post-Deployment:
```bash
# Crear superusuario
python manage.py createsuperuser

# Cargar datos iniciales (estilos, categorías)
python manage.py loaddata initial_styles.json

# Collectstatic (producción)
python manage.py collectstatic --noinput
```

---

## 📊 Monitoreo y Logs

### Logs Principales:
- **Django**: Aplicación principal
- **Celery**: Tareas asíncronas
- **OpenAI**: Requests a API externa
- **AWS**: Operaciones S3/Rekognition

### Métricas Importantes:
- Tiempo de procesamiento de imágenes
- Tasa de éxito/error en OpenAI
- Uso de cuotas por usuario
- Almacenamiento utilizado

---

## 🛠️ Desarrollo y Testing

### Estructura de Tests:
```
tests/
├── test_users.py       # Tests de autenticación
├── test_images.py      # Tests de gestión de imágenes
├── test_styles.py      # Tests de estilos
└── test_processing.py  # Tests de procesamiento
```

### Ejecutar Tests:
```bash
python manage.py test
```

### Herramientas de Desarrollo:
- **Django Extensions**: Utilities adicionales
- **DRF Browsable API**: Interfaz web para testing
- **Flower**: Monitoreo de Celery
- **Django Admin**: Panel de administración

---

## 📝 Consideraciones de Seguridad

1. **Autenticación**: Token-based con expiración
2. **Moderación**: Contenido verificado antes de procesamiento
3. **Validación**: Inputs validados en serializers
4. **Cuotas**: Límites por usuario para prevenir abuso
5. **CORS**: Configurado para dominios específicos
6. **URLs Firmadas**: Acceso temporal a recursos S3

---

## 🔧 Troubleshooting

### Problemas Comunes:

1. **OpenAI API Error**: Verificar API key y límites
2. **S3 Upload Failed**: Verificar credenciales AWS
3. **Celery Tasks Stuck**: Reiniciar worker y verificar Redis
4. **Database Connection**: Verificar configuración y red Docker
5. **Memory Issues**: Optimizar tamaño de imágenes

### Debug Mode:
```bash
# Habilitar logs detallados
DEBUG=True
LOGGING_LEVEL=DEBUG
```

---

**¡El backend de SplashMy está listo para transformar imágenes con el poder de la IA!** 🎨✨
