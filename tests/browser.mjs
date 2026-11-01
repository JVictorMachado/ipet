import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
process.env.IPET_TEST = "1";
process.env.IPET_DB = join(
  mkdtempSync(join(tmpdir(), "ipet-ui-")),
  "db.sqlite",
);
const { server } = await import("../server.mjs");
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const fill = async (name, value) =>
  page.locator('[name="' + name + '"]').fill(value);
const goto = async (path) => page.goto(base + "/" + path);
try {
  await goto("login.html?cadastro=1");
  await fill("nome", "Teste UI");
  await fill("email", "ui@example.com");
  await fill("senha", "senha-ui-12345");
  await page.locator("#auth-form button").click();
  const code = await page.locator("#recovery-code").textContent();
  await page.locator("#continue").click();
  await page.waitForURL("**/meus-anuncios.html");
  await goto("publicar.html");
  await page.locator("[name=tipo][value=perdido]").check();
  await fill("nome_animal", "Bento QA");
  await page.locator("[name=especie]").selectOption("Cachorro");
  for (const [k, v] of Object.entries({
    descricao: "Teste completo",
    data_ocorrencia: "2026-01-01",
    cidade: "Brasília",
    bairro: "Centro",
    contato: "ui@example.com",
  }))
    await fill(k, v);
  await page.locator("[name=consentimento]").check();
  const buffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.locator("[name=foto]").setInputFiles([
    { name: "pet.png", mimeType: "image/png", buffer },
    { name: "pet2.png", mimeType: "image/png", buffer },
  ]);
  await page.locator(".photo-manager img").nth(1).waitFor();
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/detalhes.html?id=*");
  const detail = page.url();
  await page.locator(".gallery img").nth(1).waitFor();
  await page.locator("#favorite").click();
  await page
    .getByText("Anúncio salvo nos favoritos.", { exact: true })
    .waitFor();
  await goto("favoritos.html");
  await page.locator(".pet-card").waitFor();
  await page.goto(detail);
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await fill("nome_animal", "Bento editado");
  await page
    .getByRole("button", { name: "Remover foto 2", exact: true })
    .click();
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/detalhes.html?id=*");
  await page
    .getByRole("heading", { name: "Bento editado", exact: true })
    .waitFor();
  page.on("dialog", (d) => d.accept());
  await page.locator("#resolve").click();
  await page.getByText("✓ Caso resolvido", { exact: true }).waitFor();
  await goto("anuncios.html");
  await page.locator("#filters [name=q]").fill("bento");
  await page.locator("#filters .button").click();
  await page.locator(".pet-card").waitFor();
  await page.locator("[name=ordem]").selectOption("nome");
  await page.locator("[name=tipo]").selectOption("encontrado");
  await page.locator("#filters .button").click();
  await page.getByText("Nenhum anúncio encontrado", { exact: true }).waitFor();
  await goto("perfil.html");
  await fill("nome", "Perfil editado");
  await fill("senhaAtual", "senha-ui-12345");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await page.getByText("Perfil atualizado.", { exact: true }).waitFor();
  await page.locator("#logout").click();
  await page.waitForURL(base + "/index.html");
  await goto("recuperar.html");
  await fill("email", "ui@example.com");
  await fill("codigo", code);
  await fill("senha", "nova-ui-12345");
  await page.getByRole("button", { name: "Redefinir senha" }).click();
  await page.locator("#recovery-code").waitFor();
  await goto("login.html");
  await fill("email", "ui@example.com");
  await fill("senha", "nova-ui-12345");
  await page.locator("#auth-form button").click();
  await page.waitForURL("**/meus-anuncios.html");
  await page.goto(detail);
  await page.locator("#favorite").click();
  await page
    .getByText("Anúncio removido dos favoritos.", { exact: true })
    .waitFor();
  await page.locator("#contact").click();
  await page.getByText("Contato copiado.", { exact: true }).waitFor();
  await page.evaluate(() => {
    navigator.share = undefined;
  });
  await page.locator("#share").click();
  await page
    .getByText("Link copiado para compartilhar.", { exact: true })
    .waitFor();
  await page.locator("#delete").click();
  await page.waitForURL("**/meus-anuncios.html");
  await page
    .getByText("Você ainda não publicou nenhum anúncio", { exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await goto("perfil.html");
  await page.locator("#profile").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  mkdirSync(new URL("../../artifacts/", import.meta.url), { recursive: true });
  await page.screenshot({
    path: new URL(
      "../../artifacts/perfil-mobile.png",
      import.meta.url,
    ).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS Edge: cadastro, login, fotos, edição, encerramento, histórico, favoritos, filtros, ordenação, contato, compartilhamento, perfil, recuperação, exclusão e largura móvel.",
  );
} catch (e) {
  console.error("URL", page.url());
  console.error((await page.locator("body").innerText()).slice(-2000));
  console.error(errors);
  throw e;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
