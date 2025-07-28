# 📚 SplashMy API Documentation

Esta documentación describe todos los endpoints disponibles en la API de SplashMy para la transformación de imágenes con IA.

## 🔗 Base URL
```
http://localhost:8000/api/v1/
```

## 🔐 Autenticación
La API utiliza autenticación por token. Incluye el header en todas las requests autenticadas:
```
Authorization: Token YOUR_TOKEN_HERE
```

---

## 👤 **1. AUTENTICACIÓN DE USUARIOS**

### A) Registro de Usuario
Crea una nueva cuenta de usuario en el sistema.

**Endpoint:** `POST /auth/register/`
**Autenticación:** No requerida

**Body:**
```json
{
  "username": "testuser",
  "email": "user@example.com",
  "password": "securepassword123",
  "password_confirm": "securepassword123"
}
```

**Respuesta exitosa (201):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "testuser",
    "first_name": "",
    "last_name": "",
    "is_premium": false,
    "processing_count": 0,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "message": "User created successfully"
}
```

### B) Login de Usuario
Inicia sesión con credenciales existentes.

**Endpoint:** `POST /auth/login/`
**Autenticación:** No requerida

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Respuesta exitosa (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "testuser",
    "is_premium": false
  },
  "token": "9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b",
  "message": "Login successful"
}
```

⚠️ **Importante:** Guarda el token de la respuesta para las siguientes requests.

### C) Ver Perfil
Obtiene información del usuario autenticado.

**Endpoint:** `GET /auth/profile/`
**Autenticación:** Requerida

**Respuesta exitosa (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "testuser",
  "first_name": "",
  "last_name": "",
  "avatar": null,
  "is_premium": false,
  "processing_count": 5,
  "created_at": "2025-01-01T00:00:00Z",
  "profile": {
    "bio": "",
    "preferred_styles": [],
    "max_daily_processes": 10
  }
}
```

---

## 📸 **2. GESTIÓN DE IMÁGENES**

### A) Subir Imagen
Sube una nueva imagen al sistema para su posterior procesamiento.

**Endpoint:** `POST /images/upload/`
**Autenticación:** Requerida
**Content-Type:** `multipart/form-data`

**Campos:**
- `image`: Archivo de imagen (requerido)
- `description`: Descripción opcional (texto)

**Respuesta exitosa (201):**
```json
{
  "id": 1,
  "filename": "uploaded_image.jpg",
  "description": "Mi imagen para transformar",
  "file_size": 1024000,
  "dimensions": "1920x1080",
  "upload_date": "2025-01-01T00:00:00Z",
  "is_public": false,
  "url": "/media/images/uploaded_image.jpg"
}
```

### B) Listar Mis Imágenes
Obtiene todas las imágenes subidas por el usuario.

**Endpoint:** `GET /images/`
**Autenticación:** Requerida

**Parámetros de consulta opcionales:**
- `page`: Número de página
- `search`: Buscar por descripción

### C) Ver Imágenes Públicas
Lista imágenes marcadas como públicas por otros usuarios.

**Endpoint:** `GET /images/public/`
**Autenticación:** No requerida

### D) Estadísticas de Imágenes
Obtiene estadísticas de uso de imágenes del usuario.

**Endpoint:** `GET /images/stats/`
**Autenticación:** Requerida

**Respuesta:**
```json
{
  "total_images": 25,
  "total_processed": 15,
  "storage_used_mb": 150.5,
  "favorite_styles": ["Studio Ghibli", "Simpsons"]
}
```

---

## 🎨 **3. ESTILOS ARTÍSTICOS**

### A) Listar Categorías de Estilos
Obtiene todas las categorías de estilos disponibles.

**Endpoint:** `GET /styles/categories/`
**Autenticación:** No requerida

**Respuesta:**
```json
[
  {
    "id": 1,
    "name": "Animación Japonesa",
    "description": "Estilos de anime y manga",
    "styles_count": 5
  },
  {
    "id": 2,
    "name": "Animación Occidental",
    "description": "Estilos de animación occidental",
    "styles_count": 3
  }
]
```

### B) Listar Todos los Estilos
Obtiene todos los estilos artísticos disponibles.

**Endpoint:** `GET /styles/`
**Autenticación:** No requerida

**Respuesta:**
```json
[
  {
    "id": 1,
    "name": "Studio Ghibli",
    "description": "Estilo característico de las películas de Studio Ghibli",
    "category": {
      "id": 1,
      "name": "Animación Japonesa"
    },
    "preview_image": "/media/styles/ghibli_preview.jpg",
    "usage_count": 1250,
    "average_rating": 4.8,
    "is_premium": false
  }
]
```

### C) Buscar Estilos por Categoría
Filtra estilos por categoría específica.

**Endpoint:** `GET /styles/?category=1`
**Autenticación:** No requerida

### D) Buscar Estilos por Nombre
Busca estilos por nombre o descripción.

**Endpoint:** `GET /styles/?search=ghibli`
**Autenticación:** No requerida

### E) Estilos Más Populares
Obtiene los estilos más utilizados.

**Endpoint:** `GET /styles/popular/`
**Autenticación:** No requerida

### F) Marcar Estilo como Favorito
Añade un estilo a los favoritos del usuario.

**Endpoint:** `POST /styles/{style_id}/favorite/`
**Autenticación:** Requerida

### G) Calificar Estilo
Permite al usuario calificar un estilo.

**Endpoint:** `POST /styles/{style_id}/rate/`
**Autenticación:** Requerida

**Body:**
```json
{
  "rating": 5,
  "comment": "Excelente estilo artístico!"
}
```

---

## ⚡ **4. PROCESAMIENTO CON OPENAI**

### A) Crear Job de Procesamiento (Generación)
Crea un nuevo trabajo de generación de imagen desde texto.

**Endpoint:** `POST /processing/jobs/`
**Autenticación:** Requerida

**Body:**
```json
{
  "job_type": "generation",
  "style_id": 1,
  "prompt": "Un hermoso paisaje al estilo Studio Ghibli",
  "quality": "hd",
  "size": "1024x1024",
  "n": 1
}
```

**Respuesta:**
```json
{
  "id": "job_12345",
  "status": "pending",
  "job_type": "generation",
  "style": {
    "id": 1,
    "name": "Studio Ghibli"
  },
  "prompt": "Un hermoso paisaje al estilo Studio Ghibli",
  "created_at": "2025-01-01T00:00:00Z",
  "estimated_completion": "2025-01-01T00:02:00Z"
}
```

### B) Procesamiento con Imagen Existente (Edición)
Transforma una imagen existente aplicando un estilo.

**Endpoint:** `POST /processing/jobs/`
**Autenticación:** Requerida

**Body:**
```json
{
  "job_type": "editing",
  "input_image_id": 1,
  "style_id": 2,
  "prompt": "Convertir esta imagen al estilo de Los Simpsons",
  "quality": "hd",
  "size": "1024x1024"
}
```

### C) Ver Mis Jobs de Procesamiento
Lista todos los trabajos de procesamiento del usuario.

**Endpoint:** `GET /processing/jobs/list/`
**Autenticación:** Requerida

**Respuesta:**
```json
{
  "results": [
    {
      "id": "job_12345",
      "status": "completed",
      "job_type": "editing",
      "style_name": "Los Simpsons",
      "created_at": "2025-01-01T00:00:00Z",
      "completed_at": "2025-01-01T00:02:30Z",
      "result_image": "/media/results/result_12345.jpg"
    }
  ],
  "count": 1,
  "next": null,
  "previous": null
}
```

### D) Ver Detalles de un Job Específico
Obtiene información detallada de un trabajo.

**Endpoint:** `GET /processing/jobs/{job_id}/`
**Autenticación:** Requerida

### E) Ver Resultados de Procesamiento
Lista todos los resultados completados del usuario.

**Endpoint:** `GET /processing/results/`
**Autenticación:** Requerida

### F) Cancelar Job en Progreso
Cancela un trabajo que está en progreso.

**Endpoint:** `POST /processing/jobs/{job_id}/cancel/`
**Autenticación:** Requerida

### G) Ver Mi Cuota de Usuario
Verifica el uso actual y límites del usuario.

**Endpoint:** `GET /processing/quota/`
**Autenticación:** Requerida

**Respuesta:**
```json
{
  "plan": "free",
  "daily_limit": 10,
  "daily_used": 3,
  "monthly_limit": 100,
  "monthly_used": 25,
  "reset_at": "2025-01-02T00:00:00Z"
}
```

### H) Estadísticas de Procesamiento
Obtiene estadísticas detalladas de procesamiento.

**Endpoint:** `GET /processing/stats/`
**Autenticación:** Requerida

---

## 📊 **5. ENDPOINTS DE INFORMACIÓN GENERAL**

### A) Estadísticas Generales de Estilos
Información estadística sobre el uso de estilos.

**Endpoint:** `GET /styles/stats/`
**Autenticación:** No requerida

### B) Actividad del Usuario con Estilos
Historial de uso de estilos del usuario.

**Endpoint:** `GET /styles/user-activity/`
**Autenticación:** Requerida

### C) Plantillas de Procesamiento
Plantillas predefinidas para facilitar el procesamiento.

**Endpoint:** `GET /processing/templates/`
**Autenticación:** No requerida

---

## 🔧 **Pasos de Prueba Recomendados**

1. **Registro y Login:**
   - Registrar nuevo usuario
   - Hacer login y obtener token
   - Verificar perfil

2. **Gestión de Imágenes:**
   - Subir imagen de prueba
   - Listar imágenes propias
   - Ver estadísticas

3. **Explorar Estilos:**
   - Ver categorías disponibles
   - Listar estilos populares
   - Marcar favoritos

4. **Procesamiento:**
   - Crear job de transformación
   - Monitorear progreso
   - Descargar resultado

5. **Verificar Cuotas:**
   - Revisar uso actual
   - Verificar límites del plan

---

## 🚨 **Códigos de Estado HTTP**

- `200` - OK
- `201` - Creado exitosamente
- `400` - Error de validación
- `401` - No autenticado
- `403` - Sin permisos
- `404` - No encontrado
- `429` - Límite de cuota excedido
- `500` - Error interno del servidor

---

## 🛡️ **Validación de Contenido**

**Importante:** Todas las imágenes pasan por Amazon Rekognition para detectar contenido explícito antes de ser procesadas por OpenAI. Las imágenes que no cumplan con nuestras políticas de contenido serán rechazadas automáticamente.

## 💡 **Consejos para Desarrolladores**

- Siempre manejar respuestas de error apropiadamente
- Implementar retry logic para jobs de procesamiento
- Usar paginación en endpoints que retornan listas
- Verificar cuotas antes de crear nuevos jobs
- Implementar loading states para mejor UX

---

¿Necesitas ayuda? Consulta el [README principal](../README.md) o contacta al equipo de desarrollo.
