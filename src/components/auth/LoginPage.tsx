import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login({
      email: email.trim(),
      password,
    });

    if (!result.success) {
      setError(result.message ?? 'No se pudo iniciar sesión');
      setIsSubmitting(false);
      return;
    }

    const targetPath = result.user?.roleKey
      ? `/home/${result.user.roleKey}`
      : '/home';

    navigate(targetPath, { replace: true });
    setIsSubmitting(false);
  };



  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Columna izquierda: branding (solo desktop). */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Dumbbell className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white tracking-tight">FitLogic</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-5xl xl:text-6xl font-bold text-white leading-[1.08] tracking-tight text-balance">
            El sistema integral para la gestión de tu gimnasio
          </h1>
          <p className="text-white/80 text-xl xl:text-2xl leading-relaxed max-w-xl">
            Controla membresías, rutinas, clases, pagos y mucho más desde una sola plataforma.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <p className="text-white text-xl xl:text-2xl font-semibold tracking-tight">
            La lógica detrás de cada entrenamiento.
          </p>
          <div className="text-white/60 text-sm">
            © 2026 FitLogic. Todos los derechos reservados Diaz-Pichot.
          </div>
        </div>
      </div>

      {/* Columna derecha: el formulario se centra vertical y horizontalmente dentro de SU mitad.
          min-h-dvh evita el salto de la barra del navegador en móvil; si el teclado achica la
          pantalla, la página scrollea. En móvil la columna ocupa todo el ancho (layout apilado). */}
      <div className="relative flex min-h-dvh w-full items-center justify-center px-6 py-16 sm:px-12 lg:w-1/2 lg:px-12 lg:py-8 2xl:px-16 2xl:py-12">
        {/* Card del formulario: superficie plana (bg-card + borde), sin blur ni sombras marcadas. */}
        <div className="flex w-full max-w-md flex-col gap-10 rounded-3xl border border-border bg-card p-6 shadow-lg shadow-black/10 sm:max-w-lg sm:p-10 lg:p-8 xl:max-w-[38rem] xl:p-10 2xl:max-w-[41rem] 2xl:p-12">
          <div className="lg:hidden flex items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-4xl font-bold tracking-tight text-foreground">FitLogic</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-3xl xl:text-4xl 2xl:text-5xl">Bienvenido de vuelta</h2>
            <p className="mt-4 text-lg text-muted-foreground 2xl:text-xl">Ingresá tus credenciales para acceder al sistema</p>
          </div>

          <form className="space-y-7" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2.5">
              <label htmlFor="login-email" className="text-base font-medium text-foreground xl:text-lg">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full rounded-xl border border-border bg-secondary py-5 pl-14 pr-4 text-lg text-foreground transition-all placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary xl:text-xl"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label htmlFor="login-password" className="text-base font-medium text-foreground xl:text-lg">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-secondary py-5 pl-14 pr-14 text-lg text-foreground transition-all placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary xl:text-xl"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary py-8 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary/90 xl:text-xl"
            >
              {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </div>

        {/* En móvil el panel izquierdo no existe: el copyright pasa al pie de esta columna. */}
        <p className="absolute inset-x-4 bottom-4 text-center text-xs text-muted-foreground lg:hidden">
          © 2026 FitLogic. Todos los derechos reservados Diaz-Pichot.
        </p>
      </div>
    </div>
  );
}
