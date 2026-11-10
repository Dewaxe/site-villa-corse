import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDemoWebP } from "./webp.js";

const project = fileURLToPath(new URL("../../", import.meta.url));
const wrangler = join(project, "node_modules", "wrangler", "bin", "wrangler.js");
const config = join(project, "benchmarks", "session", "wrangler.jsonc");
const stateRoot = resolve(project, ".wrangler");
const backupRoot = resolve(project, "backups");
const namePattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const limits = { title: 120, description: 240, body: 4_000 };
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const mediaKey = (id) => "article/" + id + ".webp";
const imageFile = (folder, id) => join(folder, "images", id + ".webp");

function run(state, ...args) {
  const result = spawnSync(process.execPath, [wrangler, ...args, "--local", "--persist-to", state, "--config", config], {
    cwd: project,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    timeout: 90_000,
    maxBuffer: 8 * 1024 ** 2,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Échec Wrangler (" + args.slice(0, 3).join(" ") + ").");
  return result.stdout;
}

function snapshot(state) {
  const query = [
    "SELECT version, revision_id FROM article_state WHERE id = 1",
    "SELECT id, title, description, body, published FROM article_revisions ORDER BY id",
  ].join("; ");
  const [pointer, revisions] = JSON.parse(run(state, "d1", "execute", "DB", "--json", "--command", query));
  return { pointer: pointer.results[0], revisions: revisions.results };
}

async function checkImage(bytes, id) {
  const file = new File([bytes], "image.webp", { type: "image/webp" });
  if (!(await isDemoWebP(file))) throw new Error("Image WebP absente ou invalide : " + id);
}

function checkManifest(manifest) {
  if (manifest?.format !== 1 || !Array.isArray(manifest.revisions) || !manifest.pointer ||
      !Number.isSafeInteger(manifest.pointer.version) || manifest.pointer.version < 0) {
    throw new Error("Format de manifeste invalide.");
  }

  const ids = new Set();
  for (const revision of manifest.revisions) {
    if (!revision || typeof revision.id !== "string" || !idPattern.test(revision.id) || ids.has(revision.id) ||
        ![0, 1].includes(revision.published) || typeof revision.sha256 !== "string" ||
        !/^[0-9a-f]{64}$/.test(revision.sha256) ||
        Object.entries(limits).some(([field, max]) => typeof revision[field] !== "string" ||
          !revision[field].trim() || revision[field].length > max)) {
      throw new Error("Révision invalide dans le manifeste.");
    }
    ids.add(revision.id);
  }

  const active = manifest.pointer.revision_id;
  if (active === null) {
    if (manifest.pointer.version !== 0 || manifest.revisions.some(({ published }) => published)) {
      throw new Error("État de publication incohérent.");
    }
  } else if (!manifest.pointer.version || !manifest.revisions.some(({ id, published }) => id === active && published === 1)) {
    throw new Error("Révision publiée absente du manifeste.");
  }
}

async function exportBackup(state, folder) {
  if (!existsSync(state) || existsSync(folder)) throw new Error("Source absente ou sauvegarde déjà présente.");
  const data = snapshot(state);
  const stage = join(backupRoot, ".partial-" + randomUUID());
  mkdirSync(backupRoot, { recursive: true });
  mkdirSync(stage);
  mkdirSync(join(stage, "images"));

  const revisions = [];
  for (const revision of data.revisions) {
    if (!idPattern.test(revision.id)) throw new Error("Identifiant de révision invalide.");
    const bytes = run(state, "kv", "key", "get", mediaKey(revision.id), "--binding", "IMAGES");
    await checkImage(bytes, revision.id);
    writeFileSync(imageFile(stage, revision.id), bytes);
    revisions.push({ ...revision, sha256: hash(bytes) });
  }
  const manifest = { format: 1, pointer: data.pointer, revisions };
  checkManifest(manifest);
  const bytes = Buffer.from(JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(stage, "manifest.json"), bytes);
  writeFileSync(join(stage, "manifest.sha256"), hash(bytes) + "\n");
  renameSync(stage, folder);
  console.log("Export local : " + revisions.length + " révision(s) et image(s).");
}

async function verifyBackup(folder) {
  const bytes = readFileSync(join(folder, "manifest.json"));
  if (hash(bytes) !== readFileSync(join(folder, "manifest.sha256"), "utf8").trim()) {
    throw new Error("Empreinte du manifeste invalide.");
  }
  const manifest = JSON.parse(bytes);
  checkManifest(manifest);
  const images = new Map();
  for (const revision of manifest.revisions) {
    let image;
    try {
      image = readFileSync(imageFile(folder, revision.id));
    } catch (error) {
      if (error.code === "ENOENT") throw new Error("Image absente : " + revision.id);
      throw error;
    }
    if (hash(image) !== revision.sha256) throw new Error("Empreinte d’image invalide : " + revision.id);
    await checkImage(image, revision.id);
    images.set(revision.id, image);
  }
  return { manifest, images };
}

// Use hex literals so even quotes and NUL bytes from a draft cannot alter the SQL.
const sqlText = (value) => "CAST(X'" + Buffer.from(value).toString("hex") + "' AS TEXT)";

async function restoreBackup(state, folder) {
  if (existsSync(state)) throw new Error("La cible existe déjà. Choisir un nouvel état local.");
  const { manifest: { pointer, revisions }, images } = await verifyBackup(folder);

  mkdirSync(stateRoot, { recursive: true });
  mkdirSync(state);
  run(state, "d1", "migrations", "apply", "DB");
  const imagePath = join(state, "restore.webp");
  for (const [id, bytes] of images) {
    writeFileSync(imagePath, bytes, { flag: "wx" });
    try {
      run(state, "kv", "key", "put", mediaKey(id), "--binding", "IMAGES", "--path", imagePath);
    } finally {
      unlinkSync(imagePath);
    }
  }
  const sql = revisions.map(({ id, title, description, body, published }) => {
    const values = [id, title, description, body].map(sqlText).concat(published).join(", ");
    return "INSERT INTO article_revisions (id, title, description, body, published) VALUES (" + values + ");";
  });
  const active = pointer.revision_id === null ? "NULL" : sqlText(pointer.revision_id);
  sql.push("UPDATE article_state SET version = " + pointer.version + ", revision_id = " + active + " WHERE id = 1;");
  const sqlFile = join(state, "restore.sql");
  writeFileSync(sqlFile, sql.join("\n"), { flag: "wx" });
  try {
    run(state, "d1", "execute", "DB", "--file", sqlFile);
  } finally {
    unlinkSync(sqlFile);
  }
  console.log("Import local : " + revisions.length + " révision(s) et image(s). Comptes et sessions exclus.");
}

const [action, stateName, backupName, ...extra] = process.argv.slice(2);
if (extra.length || !["export", "restore"].includes(action) || !namePattern.test(stateName ?? "") ||
    !namePattern.test(backupName ?? "")) {
  throw new Error("Usage : node benchmarks/session/backup.js <export|restore> <nom-état> <nom-sauvegarde>");
}
const state = join(stateRoot, stateName);
const folder = join(backupRoot, backupName);
if (action === "export") await exportBackup(state, folder);
else await restoreBackup(state, folder);
