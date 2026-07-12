import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(resolve(rootDir, "index.html"), "utf8");
const appJs = readFileSync(resolve(rootDir, "app.js"), "utf8");
const errors = [];

const appVersion = appJs.match(/const appVersion = "([^"]+)";/)?.[1];
const changelogVersion = appJs.match(/const appChangelog = \[\s*\{\s*version: "([^"]+)"/)?.[1];

if (!appVersion) errors.push("app.js icinde appVersion bulunamadi.");
if (!changelogVersion) errors.push("app.js icinde en yeni changelog surumu bulunamadi.");
if (appVersion && changelogVersion && appVersion !== changelogVersion) {
  errors.push(`appVersion (${appVersion}) ile en yeni changelog (${changelogVersion}) ayni degil.`);
}

const indexAssetRefs = [...indexHtml.matchAll(/\b(?:href|src)="(\.\/[^"?]+\.(?:css|js|svg))(?:\?v=([^"&]+))?"/g)]
  .map((match) => ({ source: "index.html", path: match[1], version: match[2] }));
const moduleImportRefs = [...appJs.matchAll(/\bfrom "(\.\/[^"?]+\.js)(?:\?v=([^"&]+))?"/g)]
  .map((match) => ({ source: "app.js import", path: match[1], version: match[2] }));
const assetRefs = [...indexAssetRefs, ...moduleImportRefs];

if (!assetRefs.length) errors.push("Dogrulanacak yerel CSS/JS/SVG referansi bulunamadi.");

for (const asset of assetRefs) {
  const diskPath = resolve(rootDir, asset.path.replace(/^\.\//, ""));
  if (!existsSync(diskPath)) errors.push(`${asset.source}: bulunamayan asset ${asset.path}`);
  if (!asset.version) errors.push(`${asset.source}: cache-buster eksik ${asset.path}`);
  else if (appVersion && asset.version !== appVersion) {
    errors.push(`${asset.source}: ${asset.path}?v=${asset.version}, appVersion ${appVersion} olmali.`);
  }
}

if (errors.length) {
  console.error("Release dogrulamasi basarisiz:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Release dogrulamasi basarili: v${appVersion}, ${assetRefs.length} yerel asset referansi uyumlu.`);
}
