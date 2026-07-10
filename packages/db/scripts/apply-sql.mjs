// Aplica os arquivos SQL de prisma/sql/ em ordem, na conexão DIRECT_URL.
// Rode após `prisma migrate` para criar RPC, RLS e publicação de tempo real.
//   node ./scripts/apply-sql.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, "..", "prisma", "sql");

// Carrega o .env único da raiz do monorepo (fallback: cwd).
config({ path: join(__dirname, "..", "..", "..", ".env") });
config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("✖ Defina DIRECT_URL (ou DATABASE_URL) no .env");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

const files = readdirSync(sqlDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

try {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(join(sqlDir, file), "utf8");
    process.stdout.write(`→ aplicando ${file} ... `);
    await client.query(sql);
    console.log("ok");
  }
  console.log("✔ SQL aplicado com sucesso.");
} catch (err) {
  console.error("\n✖ Falha ao aplicar SQL:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
