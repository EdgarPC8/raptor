/**
 * Helpers compartidos para git-push-eddeli / store / tienda / las tres a la vez.
 */
import { execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";
import { frontendRoot, loadEnvForMode, resolveDeployDir } from "./load-env.mjs";

export const APP_MODES = ["eddeli", "store", "tienda"];

export const APP_LABEL = {
  eddeli: "EdDeli",
  store: "Store",
  tienda: "Tienda",
};

export const raptorRoot = resolve(frontendRoot, "..");

export function defaultNote() {
  return `deploy ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
}

export function parseNote(argv) {
  return argv.join(" ").trim() || defaultNote();
}

function run(cmd, cwd, { inherit = true } = {}) {
  return execSync(cmd, {
    cwd,
    stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: true,
  });
}

function runOut(cmd, cwd) {
  return String(run(cmd, cwd, { inherit: false }) || "").trim();
}

function assertGitRepo(dir, label) {
  if (!existsSync(dir)) {
    throw new Error(`No existe la carpeta ${label}: ${dir}`);
  }
  try {
    runOut("git rev-parse --is-inside-work-tree", dir);
  } catch {
    throw new Error(`${label} no es un repo git: ${dir}`);
  }
}

export function commitAndPush(repoDir, label, message, logTag) {
  const tag = logTag || label;
  assertGitRepo(repoDir, label);

  const porcelain = runOut("git status --porcelain", repoDir);
  if (porcelain) {
    console.log(`\n[${tag}] Cambios en ${label}:`);
    console.log(porcelain);
    run("git add -A", repoDir);
    const staged = runOut("git diff --cached --name-only", repoDir);
    if (!staged) {
      console.log(`[${tag}] Nada que commitear en ${label} (solo ignorados).`);
    } else {
      run(`git commit -m ${JSON.stringify(message)}`, repoDir);
      console.log(`[${tag}] Commit OK en ${label}`);
    }
  } else {
    console.log(`[${tag}] Sin cambios locales en ${label}`);
  }

  const branch = runOut("git rev-parse --abbrev-ref HEAD", repoDir);
  try {
    runOut("git rev-parse --abbrev-ref '@{u}'", repoDir);
    const ahead = runOut(`git rev-list --count @{u}..HEAD`, repoDir);
    if (Number(ahead) > 0) {
      console.log(`[${tag}] Push ${label} → origin/${branch} (${ahead} commit(s))`);
      run("git push", repoDir);
    } else {
      console.log(`[${tag}] ${label} ya está al día con origin`);
    }
  } catch {
    console.log(`[${tag}] Push -u ${label} → origin/${branch}`);
    run(`git push -u origin ${branch}`, repoDir);
  }
}

export function deployDirFor(mode) {
  return resolveDeployDir(mode, loadEnvForMode(mode));
}

export function buildApp(mode) {
  console.log(`[git-push] Build ${APP_LABEL[mode] || mode}…`);
  run(`node scripts/build-app.mjs ${mode}`, frontendRoot);
}

/** Una app: build + push deploy + push raptor. */
export function pushOneApp(mode, note) {
  const label = APP_LABEL[mode] || mode;
  const deployDir = deployDirFor(mode);
  const tag = `git-push-${mode}`;
  console.log(`[${tag}] Nota: ${note}`);
  console.log(`[${tag}] Deploy dir: ${deployDir}`);
  console.log(`[${tag}] 1/3 Build ${label}…`);
  run(`node scripts/build-app.mjs ${mode}`, frontendRoot);
  console.log(`\n[${tag}] 2/3 Subir deploy (${mode})…`);
  commitAndPush(deployDir, mode, `deploy: ${note}`, tag);
  console.log(`\n[${tag}] 3/3 Subir código (raptor) si hay cambios…`);
  commitAndPush(raptorRoot, "raptor", `feat(${mode}): ${note}`, tag);
  console.log(`\n[${tag}] Listo. En el servidor: git pull`);
}

/**
 * Las tres (o las que pases): build de cada una, push de cada deploy,
 * y un solo commit/push de raptor al final.
 */
export function pushApps(modes, note) {
  const list = modes.length ? modes : APP_MODES;
  const tag = "git-push-apps";
  console.log(`[${tag}] Nota: ${note}`);
  console.log(`[${tag}] Apps: ${list.join(", ")}`);

  let i = 0;
  for (const mode of list) {
    i += 1;
    console.log(`\n[${tag}] ${i}/${list.length} Build ${APP_LABEL[mode] || mode}…`);
    run(`node scripts/build-app.mjs ${mode}`, frontendRoot);
    const deployDir = deployDirFor(mode);
    console.log(`[${tag}] Subir deploy (${mode})…`);
    commitAndPush(deployDir, mode, `deploy: ${note}`, tag);
  }

  console.log(`\n[${tag}] Subir código (raptor) si hay cambios…`);
  commitAndPush(raptorRoot, "raptor", `feat(apps): ${note}`, tag);
  console.log(`\n[${tag}] Listo. En el servidor, en cada app: git pull`);
}
