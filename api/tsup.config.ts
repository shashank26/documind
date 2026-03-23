// tsup.config.ts
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { defineConfig, Options } from 'tsup';

const DEBUG_MODE = process.env.DEBUG === '1' ? true : false;
const build: 'server' | 'worker' =
  process.env.SERVER === '1'
    ? 'server'
    : process.env.WORKER === '1'
      ? 'worker'
      : process.exit(1);

console.log(build);

let config: Options = {
  entry: ['src/index.ts'],
  outDir: 'dist/server',
  format: ['esm', 'cjs'],
  dts: true,
  clean: true, // Cleans this specific outDir
  watch: DEBUG_MODE,
};

if (build === 'worker') {
  config = {
    entry: ['src/worker/index.ts'],
    outDir: 'dist/worker',
    format: ['esm', 'cjs'],
    dts: true,
    external: ['bullmq'],
    clean: true, // Cleans this specific outDir
    watch: DEBUG_MODE,
  };
}

export default defineConfig(config);
