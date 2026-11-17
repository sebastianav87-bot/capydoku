// Minimal local stand-in for the D1 binding on node:sqlite (prepare/bind/first/all/run), for unit tests only.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
export function localD1(schemaPath = new URL("../schema.sql", import.meta.url)) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  const conv = (sql) => sql.replace(/\?(\d+)/g, (_, n) => `:p${n}`);
  return {
    raw: db,
    prepare(sql) {
      const st = db.prepare(conv(sql));
      let args = {};
      const api = {
        bind(...a) { args = Object.fromEntries(a.map((v, i) => [`p${i + 1}`, v])); return api; },
        async first() { return st.get(args) ?? null; },
        async all() { return { results: st.all(args) }; },
        async run() { const r = st.run(args); return { meta: { changes: Number(r.changes) } }; },
      };
      return api;
    },
  };
}
