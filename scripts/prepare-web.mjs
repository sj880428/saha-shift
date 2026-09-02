import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const outputDir = resolve(projectRoot, 'mobile-web');
const appFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'auth-service.js',
  'mobile-enhancements.js',
  'pwa.js',
  'service-worker.js',
  'manifest.webmanifest',
  'app-icon.svg'
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const file of appFiles) {
  await cp(resolve(projectRoot, file), resolve(outputDir, file));
}

const indexPath = resolve(outputDir, 'index.html');
let indexHtml = await readFile(indexPath, 'utf8');
indexHtml = indexHtml
  .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
  .replace('</head>', '  <link rel="stylesheet" href="mobile-app.css">\n</head>');
await writeFile(indexPath, indexHtml);

await writeFile(resolve(outputDir, 'mobile-app.css'), `
/* Native shell overrides. These styles are not shipped to GitHub Pages. */
html {
  background: var(--bg-color, #f8fafc);
}

body {
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}

@media (max-width: 768px) {
  body:not(.staff-mobile-mode) header {
    padding: 0.65rem 0.9rem !important;
    gap: 0.65rem !important;
    flex-wrap: nowrap !important;
  }

  body:not(.staff-mobile-mode) header > div:first-child {
    min-width: 0;
  }

  body:not(.staff-mobile-mode) .logo-section {
    gap: 0.55rem;
    flex-wrap: nowrap !important;
  }

  body:not(.staff-mobile-mode) .logo-icon {
    width: 2.15rem;
    height: 2.15rem;
    flex: 0 0 2.15rem;
    font-size: 0.78rem;
  }

  body:not(.staff-mobile-mode) .logo-text h1 {
    font-size: 0.95rem;
    line-height: 1.25;
    white-space: nowrap;
  }

  body:not(.staff-mobile-mode) .logo-text p {
    display: none;
  }

  body:not(.staff-mobile-mode) .nav-actions {
    flex: 0 0 auto;
  }

  body:not(.staff-mobile-mode) #btn-login {
    padding: 0.55rem 0.75rem !important;
    font-size: 0.82rem;
    white-space: nowrap;
  }
}
`);

// Native apps bundle their own web assets and should not retain a PWA cache.
await writeFile(resolve(outputDir, 'pwa.js'), '// Service worker disabled inside the native app.\n');

console.log(`Prepared ${appFiles.length} web assets and native overrides in ${outputDir}`);
