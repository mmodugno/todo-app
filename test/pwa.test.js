import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));

// Lista de archivos que el service worker guarda, leída del propio sw.js.
function swAssets() {
  const match = read('sw.js').match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(match, 'sw.js debe declarar const ASSETS = [...]');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function pngSize(file) {
  const buffer = readFileSync(path.join(root, file));
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG', `${file} no es un PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('el manifest tiene los campos necesarios para poder instalarse', () => {
  assert.ok(manifest.name);
  assert.ok(manifest.short_name);
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.start_url);
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
});

test('cada ícono del manifest existe y tiene el tamaño que declara', () => {
  for (const icon of manifest.icons) {
    assert.ok(existsSync(path.join(root, icon.src)), `falta ${icon.src}`);
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(icon.src), { width, height }, icon.src);
  }
});

test('index.html enlaza el manifest y define theme-color', () => {
  const html = read('index.html');
  assert.match(html, /<link[^>]+rel="manifest"[^>]+href="manifest\.webmanifest"/);
  assert.match(html, /<meta[^>]+name="theme-color"/);
});

test('el service worker guarda todos los archivos que usa la app', () => {
  const assets = new Set(swAssets().map((file) => (file === './' ? 'index.html' : file)));
  const html = read('index.html');

  const referenced = [
    ...[...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]),
    ...['app.js', 'todos.js', 'theme.js'].flatMap((file) =>
      [...read(file).matchAll(/from '\.\/([^']+)'/g)].map((m) => m[1]),
    ),
  ];
  for (const file of new Set(referenced)) {
    assert.ok(assets.has(file), `sw.js no guarda ${file}`);
  }
});

test('todos los archivos que guarda el service worker existen', () => {
  for (const file of swAssets()) {
    const target = file === './' ? 'index.html' : file;
    assert.ok(existsSync(path.join(root, target)), `falta ${file}`);
  }
});

test('el service worker versiona su caché', () => {
  assert.match(read('sw.js'), /const CACHE = 'todo-app-v\d+'/);
});

test('la app registra el service worker', () => {
  assert.match(read('app.js'), /serviceWorker\.register\('\.\/sw\.js'\)/);
});
