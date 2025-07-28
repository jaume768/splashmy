# 🎨 SplashMy - AI Style Transfer App

Una aplicación web para convertir imágenes subidas por usuarios a diferentes estilos de animación y edición utilizando inteligencia artificial.

## 📋 Descripción

SplashMy es una plataforma que permite a los usuarios transformar sus imágenes aplicando diferentes estilos artísticos como Studio Ghibli, Los Simpsons, Dragon Ball, Baki, y muchos más. La aplicación utiliza tecnología de vanguardia para crear transformaciones de alta calidad mientras mantiene la seguridad y privacidad de los usuarios.

## ✨ Características Principales

### 🖼️ Transformación de Imágenes
- **Múltiples estilos artísticos**: Studio Ghibli, Los Simpsons, Dragon Ball, Baki, etc.
- **Calidad profesional**: Generación de imágenes en alta definición
- **Procesamiento rápido**: Optimizado para resultados eficientes

### 🔒 Seguridad y Validación
- **Filtrado de contenido explícito**: Todas las imágenes pasan por Amazon Rekognition antes del procesamiento
- **Validación automática**: Solo se procesan imágenes que cumplen con nuestras políticas de contenido
- **Protección de datos**: Almacenamiento seguro en AWS S3

### 💾 Almacenamiento Inteligente
- **Producción**: Almacenamiento en Amazon S3 con alta disponibilidad
- **Desarrollo**: Almacenamiento local para desarrollo y testing
- **Backup automático**: Respaldo de todas las imágenes procesadas

### 👥 Planes de Usuario
- **Plan Gratuito**: 
  - 10 transformaciones por día
  - Estilos básicos disponibles
  - Calidad estándar
- **Plan Premium**:
  - Transformaciones ilimitadas
  - Acceso a todos los estilos
  - Calidad HD y prioridad en procesamiento
  - Historial extendido

## 🛠️ Stack Tecnológico

### Backend
- **Django 4.2+**: Framework web robusto y escalable
- **Django REST Framework**: API RESTful moderna
- **MySQL**: Base de datos relacional
- **Docker**: Containerización para desarrollo y producción

### Frontend
- **Next.js**: Framework React para desarrollo web moderno
- **React**: Biblioteca de interfaz de usuario
- **TypeScript**: Tipado estático para JavaScript

### Servicios en la Nube
- **OpenAI API**: Procesamiento de imágenes con IA
- **Amazon Rekognition**: Validación de contenido explícito
- **Amazon S3**: Almacenamiento de imágenes
- **AWS**: Infraestructura cloud

### Herramientas de Desarrollo
- **Docker Compose**: Orquestación de contenedores
- **Hot Reload**: Recarga automática en desarrollo
- **Cross-platform**: Compatible con Windows y Linux

## 🚀 Instalación y Configuración

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo del frontend)
- Cuentas de AWS (S3, Rekognition)
- API Key de OpenAI

### Ejecución con Docker

```bash
# Clonar el repositorio
git clone <repository-url>
cd Splashmy

# Crear variables de entorno

# Levantar los servicios
docker-compose up -d

# La aplicación estará disponible en:
# Backend API: http://localhost:8000
# Frontend: http://localhost:3000 (cuando esté implementado)
```

## 📖 Documentación de la API

Para probar la API, consulta el archivo de documentación completo:
- [Documentación de la API](./backend/API_DOCUMENTATION.md)

### Endpoints Principales

- **Autenticación**: `/api/v1/auth/`
- **Gestión de Imágenes**: `/api/v1/images/`
- **Estilos Artísticos**: `/api/v1/styles/`
- **Procesamiento**: `/api/v1/processing/`

## 🧪 Testing

```bash
# Tests del backend
docker-compose exec backend python manage.py test

# Acceder a la shell de Django
docker-compose exec backend python manage.py shell

# Ver logs
docker-compose logs -f backend
```

## 🔧 Desarrollo

### Hot Reload
El proyecto está configurado con hot reload tanto para backend como frontend:
- Los cambios en Python se recargan automáticamente
- Los cambios en el frontend se actualizan en tiempo real

### Estructura del Proyecto
```
Splashmy/
├── backend/           # Django API
│   ├── apps/         # Apps de Django
│   ├── config/       # Configuración
│   └── requirements.txt
├── frontend/         # Next.js App (próximamente)
├── database/         # Scripts SQL
├── docker-compose.yml
└── README.md
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Contacto

- **Proyecto**: SplashMy
- **Repositorio**: [GitHub](repository-url)

---

⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!
