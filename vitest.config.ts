import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.test-d.ts'],
    exclude: ['node_modules', 'mcp-server', '.next', 'dist'],
    typecheck: {
      enabled: true,
      include: ['**/*.test-d.ts'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.test-d.ts',
        'src/types/**/*.ts', // Schemas don't need coverage
        'src/lib/supabase/database.types.ts', // Generated file
      ],
      thresholds: {
        // Boundary validation modules require high coverage
        'src/types/validation.ts': {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        // Domain logic requires good coverage
        'src/domains/**/*.ts': {
          statements: 80,
          branches: 70,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
