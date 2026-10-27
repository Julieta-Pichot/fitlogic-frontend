import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // El build de producción falla de entrada si no se definió la URL de la API (en Vercel: Environment Variables).
  if (command === 'build' && mode === 'production' && !loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL?.trim()) {
    throw new Error('Falta VITE_API_URL para el build de producción (ej.: https://tu-api.onrender.com). Definila en las variables de entorno.');
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      // Permite abrir la app por un túnel (cloudflared / ngrok) para probar el retorno de Mercado Pago.
      allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io', '.loca.lt'],
    },
    build: {
      outDir: 'dist',
    },
  };
});
