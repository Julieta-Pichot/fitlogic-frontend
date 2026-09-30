# FitLogic — Frontend

Interfaz web del sistema de gestión de gimnasios FitLogic. Este repositorio
es la mitad "cliente" del proyecto: la interfaz con la que interactúan los
cuatro roles del sistema. Consume la API del repositorio
[fitlogic-backend](https://github.com/Julieta-Pichot/fitlogic-backend), que
corre por separado.

## Descripción

FitLogic centraliza en una sola plataforma la gestión operativa de un
gimnasio: clientes, cuotas y pagos, asistencia, rutinas personalizadas,
clases y recetas saludables. Esta aplicación tiene una única pantalla de
inicio de sesión para todos los usuarios; según el rol de la cuenta, redirige
a una de cuatro vistas distintas:

- **Cliente** (`/home/cliente`): rutinas asignadas, clases, cuotas, recetas y
  perfil.
- **Profesor** (`/home/profesor`): gestión de rutinas, clases y recetas.
- **Recepcionista** (`/home/recepcionista`): alta de clientes, registro de
  pagos y asistencias, carga de apto físico.
- **Administrador** (`/home/admin`): gestión de usuarios, planes,
  promociones y configuración general.

No hay registro público de usuarios: las cuentas las crea siempre un rol
autorizado desde el backend.

## Tecnologías utilizadas

- **React 19** — librería de interfaz de usuario.
- **Vite** — servidor de desarrollo y build.
- **TypeScript**.
- **React Router** — ruteo y protección de rutas por rol.
- **TanStack Query** — manejo de datos remotos y cache.
- **Axios** — cliente HTTP hacia la API del backend.
- **Tailwind CSS** — estilos.
- **react-hot-toast** — notificaciones.
- **lucide-react** — íconos.
- **ESLint** — linting.

## Requisitos

- **Node.js** (desarrollado y probado con la v24.16.0).
- **npm** (incluido con Node.js).
- El [backend de FitLogic](https://github.com/Julieta-Pichot/fitlogic-backend)
  corriendo y accesible (por defecto en `http://localhost:3001`).

## Instalación

```bash
git clone https://github.com/Julieta-Pichot/fitlogic-frontend.git
cd fitlogic-frontend
npm install
```

## Configuración

1. Copiá `.env.example` a `.env`:

   ```bash
   cp .env.example .env
   ```

2. Completá la variable en `.env`:

   | Variable       | Descripción                                                    |
   | -------------- | ---------------------------------------------------------------- |
   | `VITE_API_URL` | URL base de la API del backend (sin la barra final). Por defecto `http://localhost:3001`. |

## Cómo ejecutarlo

Levantar el servidor de desarrollo (con recarga en caliente):

```bash
npm run dev
```

Por defecto queda disponible en `http://localhost:5173`.

### Otros scripts disponibles

| Script            | Descripción                                    |
| ----------------- | ------------------------------------------------ |
| `npm run build`   | Genera el build de producción en `dist/`.        |
| `npm run preview` | Sirve localmente el build generado por `build`.  |
| `npm run lint`    | Corre ESLint sobre el proyecto.                  |

## Estructura del proyecto

```
src/
  components/   # Componentes de UI, organizados por rol (admin, client, trainer, receptionist)
                # y compartidos (auth, shared, ui)
  contexts/     # Contexto de autenticación (AuthContext) y de configuración (ConfigContext)
  services/     # Clientes de la API (axios) por dominio
  hooks/        # Hooks reutilizables
  types/        # Tipos de TypeScript compartidos
  utils/        # Helpers (formateo, manejo de errores, etc.)
```

---

Proyecto desarrollado como Práctica Profesionalizante (Programación sobre
redes, Desarrollo de sistemas, Administración de Sistemas y de Redes) —
Curso 6°1, 2026. Integrantes: Julieta Pichot y Jessica Diaz.
