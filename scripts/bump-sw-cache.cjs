const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "..", "sw.js");
const source = fs.readFileSync(swPath, "utf8");
const cacheRegex = /const CACHE_NAME = "golf-match-v(\d+)";/;
const match = source.match(cacheRegex);

if (!match) {
  throw new Error('No se encontro la constante CACHE_NAME con formato "golf-match-vN" en sw.js');
}

const currentVersion = Number.parseInt(match[1], 10);
const nextVersion = currentVersion + 1;
const updated = source.replace(cacheRegex, `const CACHE_NAME = "golf-match-v${nextVersion}";`);

fs.writeFileSync(swPath, updated, "utf8");
process.stdout.write(`SW cache version: v${currentVersion} -> v${nextVersion}\n`);
