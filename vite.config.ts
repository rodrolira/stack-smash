import { defineConfig } from 'vite';

// Vite empaqueta el juego web. El output va a dist/, que Capacitor copia al
// proyecto nativo con `npx cap sync`.
export default defineConfig({
  base: './', // rutas relativas: necesario para que Capacitor sirva desde file://
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    host: true, // permite probar desde el celular en la misma red durante dev
    port: 5173,
  },
});
