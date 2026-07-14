import type { CapacitorConfig } from '@capacitor/cli';

// Configuración de Capacitor. `webDir` apunta al build de Vite.
// Cambiá appId/appName por los tuyos antes de publicar.
const config: CapacitorConfig = {
  appId: 'com.tuestudio.stacksmash',
  appName: 'Stack & Smash',
  webDir: 'dist',
  backgroundColor: '#1b1035',
};

export default config;
