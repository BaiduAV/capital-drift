import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    projects: [
      { extends: true, test: { name: 'engine', environment: 'node', globals: true,
        setupFiles: ['./src/test/setup-node.ts'], include: ['src/engine/**/*.{test,spec}.ts'] } },
      { extends: true, test: { name: 'ui', environment: 'jsdom', globals: true,
        setupFiles: ['./src/test/setup.ts'], include: ['src/**/*.{test,spec}.{ts,tsx}'], exclude: ['src/engine/**'] } },
    ],
    coverage: {
      provider: 'v8', all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/engine/types.ts', 'src/components/ui/**'],
      reporter: ['text', 'html', 'json-summary', 'json', 'lcov'],
      thresholds: {
        lines: 90, statements: 90, functions: 70, branches: 75,
        'src/engine/{fixedIncome,trading,marginCall,monetaryPolicy,yieldCurves}.ts': {
          perFile: true, lines: 93, statements: 93, functions: 100, branches: 85,
        },
        'src/engine/stats.ts': { lines: 90, statements: 90, functions: 100, branches: 85 },
        'src/context/GameContext.tsx': { lines: 90, statements: 90, functions: 90, branches: 80 },
      },
    },
  },
});
