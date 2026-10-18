import { diagnostics } from './core.mjs';

try {
  console.log(JSON.stringify(diagnostics(), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
