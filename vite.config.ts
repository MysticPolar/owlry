import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // relative base works on github.io/<repo>/ and on a custom domain alike
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { port: 5173 },
  build: { target: 'es2021' },
});
