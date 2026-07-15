import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'frontend/CopilotChat.jsx',
      name: 'CopilotChatWidget',
      fileName: 'copilot-chat',
      formats: ['umd']
    },
    outDir: 'frontend/dist',
    emptyOutDir: false
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
