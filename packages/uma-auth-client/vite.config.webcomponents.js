import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dtsPlugin from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dtsPlugin({ rollupTypes: true })],
  build: {
    lib: {
      entry: "./src/main.tsx",
      name: "uma-auth-client-web-components",
      fileName: "uma-auth-client-web-components"
    },
    sourcemap: true
  },
  resolve: {
    alias: {
      src: "/src",
    }
  },
  define: {
    "process.env": {}
  },
})
