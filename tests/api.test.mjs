import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.IPET_TEST = "1";
process.env.IPET_DB = join(
  mkdtempSync(join(tmpdir(), "ipet-test-")),
  "test.sqlite",
);
const { server } = await import("../server.mjs");
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
function client() {
  let cookie = "";
  return async (path, method = "GET", body, status = 200) => {
    const r = await fetch(base + "/api" + path, {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    const data = await r.json();
    assert.equal(r.status, status, JSON.stringify(data));
    return data;
  };
}
test("contas, permissões, fotos, histórico, favoritos, perfil e recuperação", async () => {
  try {
    const a = client(),
      b = client(),
      guest = client();
    const one = await a(
      "/register",
      "POST",
      { nome: "Ana", email: "ana@example.com", senha: "senha-segura-123" },
      201,
    );
    assert.ok(one.codigo);
    assert.equal(one.usuario.nome, "Ana");
    await b(
      "/login",
      "POST",
      { email: "ana@example.com", senha: "errada" },
      401,
    );
    await b(
      "/register",
      "POST",
      { nome: "Bia", email: "bia@example.com", senha: "outra-senha-123" },
      201,
    );
    const photo =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9sAAAAASUVORK5CYII=";
    const ad = {
      tipo: "perdido",
      nome_animal: "Bento",
      especie: "Cachorro",
      descricao: "Cachorro caramelo",
      cidade: "Brasília",
      bairro: "Centro",
      contato: "ana@example.com",
      data_ocorrencia: "2026-01-01",
      fotos: [photo, photo],
    };
    await guest("/ads", "POST", ad, 401);
    const created = await a("/ads", "POST", ad, 201);
    assert.equal((await a("/ads"))[0].meuAnuncio, true);
    assert.equal((await b("/ads"))[0].meuAnuncio, false);
    await b("/ads/" + created.id, "PUT", { nome_animal: "Invadido" }, 403);
    await b("/ads/" + created.id, "DELETE", undefined, 403);
    await a("/ads/" + created.id, "PUT", {
      fotos: [photo],
      nome_animal: "Bento atualizado",
    });
    await a("/ads/" + created.id, "PUT", { status: "resolvido" });
    const updated = (await a("/ads"))[0];
    assert.equal(updated.status, "resolvido");
    assert.equal(updated.fotos.length, 1);
    assert.equal(updated.historico.length, 3);
    await b("/ads/" + created.id + "/favorite", "POST");
    assert.equal((await b("/ads"))[0].favorito, true);
    assert.equal((await a("/ads"))[0].favorito, false);
    await b("/ads/" + created.id + "/favorite", "DELETE");
    assert.equal((await b("/ads"))[0].favorito, false);
    await a(
      "/me",
      "PUT",
      {
        nome: "Ana Maria",
        email: "ana@example.com",
        telefone: "11999999999",
        senhaAtual: "errada",
      },
      403,
    );
    await a("/me", "PUT", {
      nome: "Ana Maria",
      email: "ana@example.com",
      telefone: "11999999999",
      senhaAtual: "senha-segura-123",
    });
    assert.equal((await a("/me")).nome, "Ana Maria");
    await guest(
      "/recover",
      "POST",
      {
        email: "ana@example.com",
        codigo: "incorreto",
        senha: "nova-senha-123",
      },
      400,
    );
    const recovered = await guest("/recover", "POST", {
      email: "ana@example.com",
      codigo: one.codigo,
      senha: "nova-senha-123",
    });
    assert.ok(recovered.codigo);
    assert.equal(await a("/me"), null);
    await a(
      "/login",
      "POST",
      { email: "ana@example.com", senha: "senha-segura-123" },
      401,
    );
    await a("/login", "POST", {
      email: "ana@example.com",
      senha: "nova-senha-123",
    });
    await guest(
      "/recover",
      "POST",
      {
        email: "ana@example.com",
        codigo: one.codigo,
        senha: "outra-nova-senha",
      },
      400,
    );
    await a("/ads/" + created.id, "DELETE");
    assert.equal((await a("/ads")).length, 0);
    await a("/logout", "POST");
    assert.equal(await a("/me"), null);
    const secret = await fetch(base + "/data/ipet.sqlite");
    assert.equal(secret.status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
