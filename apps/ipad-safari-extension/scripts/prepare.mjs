import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, resolve } from "node:path";
import process from "node:process";
import { URL } from "node:url";

const LOCAL_BACKEND_ORIGINS = ["http://127.0.0.1:8000", "http://localhost:8000"];
const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".map", ".txt"]);

function readArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Argumento inválido: ${key ?? "ausente"}`);
    }
    values.set(key.slice(2), value);
  }
  return values;
}

function normalizeBackendOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("A origem do backend deve usar HTTP ou HTTPS.");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Informe somente a origem do backend, sem caminho, consulta ou fragmento.");
  }
  return url.origin;
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function replaceLocalBackendOrigins(directory, backendOrigin) {
  for (const file of walk(directory)) {
    if (!TEXT_EXTENSIONS.has(extname(file))) continue;
    const original = readFileSync(file, "utf8");
    const updated = LOCAL_BACKEND_ORIGINS.reduce(
      (contents, localOrigin) => contents.replaceAll(localOrigin, backendOrigin),
      original,
    );
    if (updated !== original) writeFileSync(file, updated);
  }
}

const argumentsMap = readArguments(process.argv.slice(2));
const source = resolve(argumentsMap.get("source") ?? "dist");
const output = resolve(
  argumentsMap.get("output") ?? "apps/ipad-safari-extension/build/web-extension",
);
const backendOrigin = normalizeBackendOrigin(
  argumentsMap.get("backend-origin") ?? process.env.IPAD_BACKEND_ORIGIN ?? "",
);

if (!existsSync(join(source, "manifest.json"))) {
  throw new Error(`Build da extensão não encontrado em ${source}. Execute npm run build primeiro.`);
}

rmSync(output, { force: true, recursive: true });
cpSync(source, output, { recursive: true });

const manifestPath = join(output, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.name = "Webtoon Image Translator para iPad";
manifest.host_permissions = [
  ...(manifest.host_permissions ?? []).filter(
    (permission) => !LOCAL_BACKEND_ORIGINS.some((origin) => permission.startsWith(origin)),
  ),
  `${backendOrigin}/*`,
].filter((permission, index, permissions) => permissions.indexOf(permission) === index);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

replaceLocalBackendOrigins(output, backendOrigin);
process.stdout.write(`Pacote Safari preparado em ${output}\n`);
