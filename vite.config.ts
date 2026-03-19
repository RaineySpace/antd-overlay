import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// 入口为根目录 index.html，其中 script 指向 /demo/main.tsx
// build.outDir 使用 demo-dist，避免与 tsup 产出的 dist/ 冲突
export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'demo-dist',
    emptyOutDir: true,
  },
});
