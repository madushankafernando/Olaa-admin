import { defineConfig } from 'vitest/config';

// Next compiles JSX itself; vitest needs the automatic runtime for the component render tests.
export default defineConfig({ esbuild: { jsx: 'automatic' } });
