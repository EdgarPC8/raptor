/**
 * Compila Tienda (build producción + copia al repo tienda) y sube a Git.
 *
 * Uso (desde raptor/frontend):
 *   npm run git-push-tienda -- "v1.0.01"
 *   npm run git-push-tienda -- "actualizacion y mejora"
 *
 * 1) npm run build:tienda
 * 2) commit + push en repo tienda (deploy)
 * 3) commit + push en repo raptor si hay cambios de código
 */
import { execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";
import { frontendRoot, loadEnvForMode, resolveDeployDir } from "./load-env.mjs";

const note =
  process.argv.slice(2).join(" ").trim() ||
  `deploy ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

const fileEnv = loadEnvForMode("tienda");
const tiendaRoot = resolveDeployDir("tienda", fileEnv);
const raptorRoot = resolve(frontendRoot, "..");

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

function commitAndPush(repoDir, label, message) {
  assertGitRepo(repoDir, label);

  const porcelain = runOut("git status --porcelain", repoDir);
  if (porcelain) {
    console.log(`\n[git-push-tienda] Cambios en ${label}:`);
    console.log(porcelain);
    run("git add -A", repoDir);
    const staged = runOut("git diff --cached --name-only", repoDir);
    if (!staged) {
      console.log(`[git-push-tienda] Nada que commitear en ${label} (solo ignorados).`);
    } else {
      run(`git commit -m ${JSON.stringify(message)}`, repoDir);
      console.log(`[git-push-tienda] Commit OK en ${label}`);
    }
  } else {
    console.log(`[git-push-tienda] Sin cambios locales en ${label}`);
  }

  const branch = runOut("git rev-parse --abbrev-ref HEAD", repoDir);
  try {
    runOut("git rev-parse --abbrev-ref '@{u}'", repoDir);
    const ahead = runOut(`git rev-list --count @{u}..HEAD`, repoDir);
    if (Number(ahead) > 0) {
      console.log(`[git-push-tienda] Push ${label} → origin/${branch} (${ahead} commit(s))`);
      run("git push", repoDir);
    } else {
      console.log(`[git-push-tienda] ${label} ya está al día con origin`);
    }
  } catch {
    console.log(`[git-push-tienda] Push -u ${label} → origin/${branch}`);
    run(`git push -u origin ${branch}`, repoDir);
  }
}

console.log(`[git-push-tienda] Nota: ${note}`);
console.log(`[git-push-tienda] Deploy dir: ${tiendaRoot}`);
console.log(`[git-push-tienda] 1/3 Build Tienda…`);
run("node scripts/build-app.mjs tienda", frontendRoot);

console.log(`\n[git-push-tienda] 2/3 Subir deploy (tienda)…`);
commitAndPush(tiendaRoot, "tienda", `deploy: ${note}`);

console.log(`\n[git-push-tienda] 3/3 Subir código (raptor) si hay cambios…`);
commitAndPush(raptorRoot, "raptor", `feat(tienda): ${note}`);

console.log("\n[git-push-tienda] Listo. En el servidor: git pull");
