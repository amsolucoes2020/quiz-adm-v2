import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({mode}) => {
  const env=loadEnv(mode,process.cwd(),'');
  const sandbox=mode==='development' && env.VITE_REAL_BACKEND!=='true';
  return {
  resolve: {alias:{'@backend':fileURLToPath(new URL(sandbox?'./src/services/localSandbox.js':'./src/services/firebaseBackend.js',import.meta.url))}},
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: {
    react: ['react', 'react-dom']
  } } } }
  };
})
