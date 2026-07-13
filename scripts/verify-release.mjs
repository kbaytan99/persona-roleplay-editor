import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(resolve(rootDir, "index.html"), "utf8");
const appJs = readFileSync(resolve(rootDir, "app.js"), "utf8");
const changelogJs = readFileSync(resolve(rootDir, "scripts/changelog.js"), "utf8");
const errors = [];

const appVersion = appJs.match(/const appVersion = "([^"]+)";/)?.[1];
const changelogVersion = changelogJs.match(/export const appChangelog = \[\s*\{\s*version: "([^"]+)"/)?.[1];

if (!appVersion) errors.push("app.js icinde appVersion bulunamadi.");
if (!changelogVersion) errors.push("scripts/changelog.js icinde en yeni changelog surumu bulunamadi.");
if (appVersion && changelogVersion && appVersion !== changelogVersion) {
  errors.push(`appVersion (${appVersion}) ile en yeni changelog (${changelogVersion}) ayni degil.`);
}

// Every .js file (app.js + all split modules under scripts/) is scanned for
// import statements, not just app.js - after the module split, cross-module
// imports need the same cache-buster discipline as app.js's own top-level
// imports did before.
const scriptsDir = resolve(rootDir, "scripts");
const jsFiles = [
  { path: resolve(rootDir, "app.js"), label: "app.js", content: appJs },
  ...readdirSync(scriptsDir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => {
      const fullPath = resolve(scriptsDir, name);
      return { path: fullPath, label: `scripts/${name}`, content: readFileSync(fullPath, "utf8") };
    }),
];

const indexAssetRefs = [...indexHtml.matchAll(/\b(?:href|src)="(\.\/[^"?]+\.(?:css|js|svg))(?:\?v=([^"&]+))?"/g)]
  .map((match) => ({ source: "index.html", path: match[1], version: match[2] }));
const moduleImportRefs = jsFiles.flatMap(({ path, label, content }) =>
  [...content.matchAll(/\bfrom "(\.[^"?]+\.js)(?:\?v=([^"&]+))?"/g)].map((match) => ({
    source: `${label} import`,
    path: resolve(dirname(path), match[1]).startsWith(rootDir)
      ? `./${relative(rootDir, resolve(dirname(path), match[1])).replace(/\\/g, "/")}`
      : match[1],
    version: match[2],
  }))
);
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
