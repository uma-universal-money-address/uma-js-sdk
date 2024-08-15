import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dtsPlugin from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dtsPlugin({ rollupTypes: true })],
  build: {
    lib: {
      entry: "./src/main.tsx",
      name: "uma-auth-client",
      fileName: "uma-auth-client"
    },
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM"
        }
      }
    }
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
