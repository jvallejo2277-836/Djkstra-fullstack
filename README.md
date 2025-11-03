# Dijkstra Algorithm Visualizer - Full Stack

Un visualizador interactivo del algoritmo de Dijkstra con frontend en React y backend en Django.

## 🚀 Estructura del Proyecto

```
djstra-fullstack/
├── frontend/          # Aplicación React (TypeScript)
├── backend/           # API Django (Python)
└── README.md         # Este archivo
```

## 📋 Requisitos Previos

- **Node.js** (versión 16 o superior)
- **Python** (versión 3.8 o superior)
- **Git**

## 🛠️ Instalación y Configuración

### 1. Clonar/Descargar el Proyecto

```bash
# Si tienes el proyecto en un repositorio
git clone [URL_DEL_REPOSITORIO]
cd djstra-fullstack

# O simplemente descargar y descomprimir el ZIP
```

### 2. Configurar el Backend (Django)

```bash
cd backend

# Crear entorno virtual (recomendado)
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install django djangorestframework django-cors-headers

# Aplicar migraciones
python manage.py migrate

# Crear superusuario (opcional)
python manage.py createsuperuser
```

### 3. Configurar el Frontend (React)

```bash
cd frontend

# Instalar dependencias
npm install

# O si prefieres usar yarn
yarn install
```

## 🎯 Ejecución del Proyecto

### Opción 1: Ejecutar Backend y Frontend por Separado

#### Ejecutar el Backend:
```bash
cd backend
python manage.py runserver
# El backend estará disponible en: http://127.0.0.1:8000
```

#### Ejecutar el Frontend (en otra terminal):
```bash
cd frontend
npm start
# El frontend estará disponible en: http://localhost:3000
```

### Opción 2: Script de Ejecución Rápida (Windows)

Crear un archivo `start.bat` en la raíz del proyecto:

```batch
@echo off
echo Iniciando Dijkstra Visualizer...

echo.
echo Iniciando Backend Django...
start cmd /k "cd backend && python manage.py runserver"

timeout /t 3 /nobreak >nul

echo.
echo Iniciando Frontend React...
start cmd /k "cd frontend && npm start"

echo.
echo Ambos servicios están iniciando...
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
pause
```

## 🌐 URLs del Proyecto

- **Frontend (React)**: http://localhost:3000
- **Backend (Django API)**: http://127.0.0.1:8000
- **Django Admin**: http://127.0.0.1:8000/admin

## 📱 Funcionalidades Principales

### Frontend
- ✅ Visualización interactiva de grafos
- ✅ Algoritmo de Dijkstra paso a paso
- ✅ Arrastrar y soltar nodos
- ✅ Notificaciones toast (UX mejorada)
- ✅ Selección de nodos de inicio y fin
- ✅ Control de velocidad de animación
- ✅ Gestión de grafos múltiples

### Backend
- ✅ API REST con Django
- ✅ Modelos de Grafos, Nodos y Aristas
- ✅ Implementación del algoritmo de Dijkstra
- ✅ CORS configurado para desarrollo
- ✅ Panel de administración Django

## 🔧 Comandos Útiles

### Frontend
```bash
npm run build      # Construir para producción
npm run test       # Ejecutar pruebas
npm run eject      # Eyectar configuración (no recomendado)
```

### Backend
```bash
python manage.py makemigrations  # Crear nuevas migraciones
python manage.py migrate         # Aplicar migraciones
python manage.py shell          # Shell interactivo de Django
python manage.py collectstatic  # Recopilar archivos estáticos
```

## 🐛 Solución de Problemas

### Error de CORS
Si tienes problemas de CORS, verifica que `django-cors-headers` esté instalado y configurado correctamente en `settings.py`.

### Puerto ocupado
Si el puerto 3000 o 8000 están ocupados:
- Frontend: Presiona 'Y' cuando React pregunte por otro puerto
- Backend: Usa `python manage.py runserver 8001`

### Dependencias faltantes
```bash
# Frontend
npm install

# Backend
pip install -r requirements.txt
# Si no existe requirements.txt:
pip install django djangorestframework django-cors-headers
```

## 📚 Tecnologías Utilizadas

### Frontend
- **React** 18.x
- **TypeScript**
- **React Router** (navegación)
- **CSS Modules** (estilos)
- **Canvas API** (visualización)

### Backend
- **Django** 4.x
- **Django REST Framework**
- **SQLite** (base de datos por defecto)
- **Python** 3.x

## 🏗️ Próximas Mejoras

- [ ] Más algoritmos de grafos (BFS, DFS, A*)
- [ ] Guardar y cargar grafos
- [ ] Modo oscuro
- [ ] Exportar visualizaciones
- [ ] Grafos dirigidos y no dirigidos
- [ ] Mejores animaciones

## 👨‍💻 Desarrollo

Para contribuir al proyecto:

1. Fork del repositorio
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

---

**¡Disfruta visualizando algoritmos! 🎨✨**