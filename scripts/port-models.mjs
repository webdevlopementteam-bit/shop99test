// One-off script: ports backend/models/*.js (CommonJS Sequelize models) into
// lib/models/*.js (ESM). Mechanical only — no field/logic changes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "../../backend/models");
const outDir = path.resolve(__dirname, "../lib/models");

fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".js"));

for (const file of files) {
  let content = fs.readFileSync(path.join(srcDir, file), "utf8");

  content = content.replace(
    /const\s*\{\s*DataTypes\s*\}\s*=\s*require\(["']sequelize["']\);?/g,
    'import { DataTypes } from "sequelize";',
  );
  content = content.replace(
    /const\s+sequelize\s*=\s*require\(["']\.\.\/config\/db["']\);?/g,
    'import sequelize from "../db.js";',
  );
  // Local model-to-model requires: const X = require("./yModel"); (with or without "Model" suffix, e.g. Wishlist.js)
  content = content.replace(
    /const\s+(\w+)\s*=\s*require\((["'])(\.\/[^"']+)\2\);?/g,
    (_m, varName, _q, relPath) => `import ${varName} from "${relPath}.js";`,
  );

  content = content.replace(
    /module\.exports\s*=\s*\{([\s\S]*?)\};?/,
    (_m, inner) => `export { ${inner.trim()} };`,
  );
  content = content.replace(
    /module\.exports\s*=\s*(\w+);?/,
    (_m, name) => `export default ${name};`,
  );

  fs.writeFileSync(path.join(outDir, file), content, "utf8");
}

console.log(`Ported ${files.length} model files to ${outDir}`);
