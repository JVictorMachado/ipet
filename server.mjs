import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.IPET_DB || resolve(root, "data/ipet.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,phone TEXT NOT NULL DEFAULT '',password TEXT NOT NULL,recovery TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ads(id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS favorites(user_id TEXT REFERENCES users(id),ad_id TEXT REFERENCES ads(id) ON DELETE CASCADE,PRIMARY KEY(user_id,ad_id));`);
const hash = (v) => createHash("sha256").update(v).digest("hex");
function password(v) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(v, salt, 64).toString("hex");
}
function verify(v, stored) {
  const [salt, key] = stored.split(":");
  return timingSafeEqual(scryptSync(v, salt, 64), Buffer.from(key, "hex"));
}
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
function publicUser(u) {
  return u
    ? { id: u.id, nome: u.name, email: u.email, telefone: u.phone }
    : null;
}
function cleanUser(b) {
  const email = String(b.email || "")
      .trim()
      .toLowerCase(),
    name = String(b.nome || "").trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 150 ||
    !name ||
    name.length > 150
  )
    fail("Informe nome e e-mail válidos.");
  return {
    email,
    name,
    phone: String(b.telefone || "")
      .trim()
      .slice(0, 40),
  };
}
function validPassword(v) {
  if (typeof v !== "string" || v.length < 8 || v.length > 256)
    fail("A senha deve ter entre 8 e 256 caracteres.");
}
function cleanAd(b) {
  const out = {};
  for (const k of [
    "tipo",
    "nome_animal",
    "especie",
    "raca",
    "cor",
    "porte",
    "sexo",
    "descricao",
    "caracteristicas",
    "cidade",
    "bairro",
    "referencia",
    "data_ocorrencia",
    "contato",
  ])
    out[k] = String(b[k] || "").trim();
  if (
    !["perdido", "encontrado"].includes(out.tipo) ||
    !["Cachorro", "Gato", "Ave", "Outro"].includes(out.especie) ||
    !out.descricao ||
    !out.cidade ||
    !out.bairro ||
    !out.contato
  )
    fail("Preencha os campos obrigatórios.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(out.data_ocorrencia) ||
    !Number.isFinite(Date.parse(out.data_ocorrencia)) ||
    out.data_ocorrencia > new Date().toLocaleDateString("en-CA")
  )
    fail("Data da ocorrência inválida.");
  if (Object.values(out).some((v) => v.length > 3000))
    fail("Texto muito longo.");
  out.fotos = b.fotos;
  if (
    !Array.isArray(out.fotos) ||
    out.fotos.length < 1 ||
    out.fotos.length > 6 ||
    out.fotos.some(
      (f) =>
        typeof f !== "string" ||
        f.length > 1500000 ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(f),
    )
  )
    fail("Envie de 1 a 6 fotos JPG, PNG ou WebP.");
  out.foto_url = out.fotos[0];
  return out;
}
const attempts = new Map();
export const server = http.createServer(async (req, res) => {
  const json = (value, status = 200) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(value));
  };
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/api/")) {
      if (!["GET", "HEAD"].includes(req.method)) fail("Método inválido.", 405);
      const rel = decodeURIComponent(
        url.pathname === "/" ? "/index.html" : url.pathname,
      );
      const file = resolve(root, "." + rel);
      if (
        !file.startsWith(root + sep) ||
        ![
          ".html",
          ".css",
          ".js",
          ".png",
          ".jpg",
          ".jpeg",
          ".webp",
          ".svg",
          ".ico",
        ].includes(extname(file)) ||
        !existsSync(file)
      )
        fail("Página não encontrada.", 404);
      const types = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
      };
      res.writeHead(200, {
        "Content-Type": types[extname(file)],
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
      });
      res.end(req.method === "HEAD" ? undefined : readFileSync(file));
      return;
    }
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${req.headers.host}`
    )
      fail("Origem não autorizada.", 403);
    let b = {};
    if (!["GET", "HEAD"].includes(req.method)) {
      let chunks = [],
        size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > 10000000) fail("Dados muito grandes.", 413);
        chunks.push(c);
      }
      try {
        b = JSON.parse(Buffer.concat(chunks).toString() || "{}");
      } catch {
        fail("Dados inválidos.");
      }
    }
    const token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("ipet_session="))
      ?.slice(13);
    const user = token
      ? db
          .prepare(
            "SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?",
          )
          .get(hash(token), Date.now())
      : null;
    const auth = () => {
      if (!user) fail("Entre na sua conta.", 401);
      return user;
    };
    const path = url.pathname,
      method = req.method;
    if (
      ["/api/login", "/api/register", "/api/recover"].includes(path) &&
      method === "POST"
    ) {
      const key = req.socket.remoteAddress;
      const rate = attempts.get(key) || {
        count: 0,
        until: Date.now() + 600000,
      };
      if (rate.until < Date.now()) {
        rate.count = 0;
        rate.until = Date.now() + 600000;
      }
      attempts.set(key, rate);
      if (++rate.count > 40)
        fail("Muitas tentativas. Aguarde alguns minutos.", 429);
    }
    const session = (u) => {
      const t = randomBytes(32).toString("hex");
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        hash(t),
        u.id,
        Date.now() + 7 * 86400000,
      );
      res.setHeader(
        "Set-Cookie",
        `ipet_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`,
      );
    };
    if (path === "/api/register" && method === "POST") {
      const c = cleanUser(b);
      validPassword(b.senha);
      if (db.prepare("SELECT id FROM users WHERE email=?").get(c.email))
        fail("Este e-mail já está cadastrado.", 409);
      const code = randomBytes(16).toString("hex");
      const id = randomBytes(16).toString("hex");
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(
        id,
        c.email,
        c.name,
        c.phone,
        password(b.senha),
        hash(code),
      );
      const u = db.prepare("SELECT * FROM users WHERE id=?").get(id);
      session(u);
      return json({ usuario: publicUser(u), codigo: code }, 201);
    }
    if (path === "/api/login" && method === "POST") {
      const u = db.prepare("SELECT * FROM users WHERE email=?").get(
        String(b.email || "")
          .trim()
          .toLowerCase(),
      );
      if (!u || !verify(String(b.senha || "").slice(0, 256), u.password))
        fail("E-mail ou senha incorretos.", 401);
      session(u);
      return json(publicUser(u));
    }
    if (path === "/api/recover" && method === "POST") {
      validPassword(b.senha);
      const u = db.prepare("SELECT * FROM users WHERE email=?").get(
        String(b.email || "")
          .trim()
          .toLowerCase(),
      );
      if (!u || hash(String(b.codigo || "").trim()) !== u.recovery)
        fail("E-mail ou código de recuperação inválido.");
      const code = randomBytes(16).toString("hex");
      db.prepare("UPDATE users SET password=?,recovery=? WHERE id=?").run(
        password(b.senha),
        hash(code),
        u.id,
      );
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(u.id);
      return json({ codigo: code });
    }
    if (path === "/api/logout" && method === "POST") {
      if (token)
        db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
      res.setHeader(
        "Set-Cookie",
        "ipet_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      );
      return json({ ok: true });
    }
    if (path === "/api/me" && method === "GET") return json(publicUser(user));
    if (path === "/api/me" && method === "PUT") {
      auth();
      const c = cleanUser(b);
      if (
        db
          .prepare("SELECT id FROM users WHERE email=? AND id<>?")
          .get(c.email, user.id)
      )
        fail("Este e-mail já está cadastrado.", 409);
      if (!verify(String(b.senhaAtual || "").slice(0, 256), user.password))
        fail("Senha atual incorreta.", 403);
      if (b.senha) {
        validPassword(b.senha);
        db.prepare("UPDATE users SET password=? WHERE id=?").run(
          password(b.senha),
          user.id,
        );
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
        session(user);
      }
      db.prepare("UPDATE users SET name=?,email=?,phone=? WHERE id=?").run(
        c.name,
        c.email,
        c.phone,
        user.id,
      );
      return json(
        publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(user.id)),
      );
    }
    if (path === "/api/ads" && method === "GET") {
      const fav = new Set(
        user
          ? db
              .prepare("SELECT ad_id FROM favorites WHERE user_id=?")
              .all(user.id)
              .map((x) => x.ad_id)
          : [],
      );
      return json(
        db
          .prepare("SELECT * FROM ads")
          .all()
          .map((row) => ({
            ...JSON.parse(row.data),
            id: row.id,
            meuAnuncio: row.user_id === user?.id,
            favorito: fav.has(row.id),
          }))
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    }
    if (path === "/api/ads" && method === "POST") {
      auth();
      const ad = {
        ...cleanAd(b),
        status: "ativo",
        created_at: new Date().toISOString(),
        historico: [{ acao: "Publicado", data: new Date().toISOString() }],
      };
      const id = randomBytes(16).toString("hex");
      db.prepare("INSERT INTO ads VALUES(?,?,?)").run(
        id,
        user.id,
        JSON.stringify(ad),
      );
      return json({ id }, 201);
    }
    const match = path.match(/^\/api\/ads\/([a-f0-9]+)(\/favorite)?$/);
    if (match) {
      auth();
      const row = db.prepare("SELECT * FROM ads WHERE id=?").get(match[1]);
      if (!row) fail("Anúncio não encontrado.", 404);
      if (match[2]) {
        if (method === "POST") {
          db.prepare("INSERT OR IGNORE INTO favorites VALUES(?,?)").run(
            user.id,
            row.id,
          );
          return json({ ok: true });
        }
        if (method === "DELETE") {
          db.prepare("DELETE FROM favorites WHERE user_id=? AND ad_id=?").run(
            user.id,
            row.id,
          );
          return json({ ok: true });
        }
      } else {
        if (row.user_id !== user.id)
          fail("Você não pode alterar este anúncio.", 403);
        if (method === "DELETE") {
          db.prepare("DELETE FROM ads WHERE id=?").run(row.id);
          return json({ ok: true });
        }
        if (method === "PUT") {
          const old = JSON.parse(row.data);
          const status = b.status ?? old.status;
          if (!["ativo", "resolvido"].includes(status))
            fail("Status inválido.");
          const changed = {
            ...old,
            ...cleanAd({ ...old, ...b }),
            status,
            historico: [
              ...old.historico,
              {
                acao: status !== old.status ? "Caso encerrado" : "Editado",
                data: new Date().toISOString(),
              },
            ],
          };
          db.prepare("UPDATE ads SET data=? WHERE id=?").run(
            JSON.stringify(changed),
            row.id,
          );
          return json({ id: row.id });
        }
      }
    }
    fail("Recurso não encontrado.", 404);
  } catch (e) {
    if (!res.headersSent)
      json(
        {
          erro: e.status ? e.message : "Não foi possível concluir a operação.",
        },
        e.status || 500,
      );
    else res.end();
  }
});
if (process.env.IPET_TEST !== "1")
  server.listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
    console.log("iPet: http://localhost:" + (process.env.PORT || 3000)),
  );
