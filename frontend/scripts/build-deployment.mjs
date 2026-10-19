import { build } from 'vite';

// Lessons are bundled with the app; no database credentials are required.
await build({ mode: 'production' });
