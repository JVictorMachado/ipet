import { filtrar } from "./filtros.js";
import {
  adicionarAnuncio,
  atualizarAnuncio,
  buscarAnuncio,
  marcarComoResolvido,
  obterAnuncios,
  obterUsuario,
  removerAnuncio,
  sairUsuario,
  salvarUsuario,
} from "./storage.js";

const pagina = location.pathname.split("/").pop() || "index.html";
const parametros = new URLSearchParams(location.search);
const conteudo = document.querySelector("main");
let usuario = obterUsuario();

function escaparHtml(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[caractere],
  );
}

function formatarData(valor) {
  if (!valor) return "Data não informada";
  return new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR");
}

function nomeDoAnimal(anuncio) {
  return anuncio.nome_animal || `${anuncio.especie} sem nome`;
}

function avisoDeDemonstracao() {
  return '<div class="demo"><span class="demo-dot"></span> Versão demonstrativa <span>· Os dados ficam salvos somente neste navegador.</span></div>';
}

function montarCabecalho() {
  const areaDaConta = usuario
    ? '<a href="meus-anuncios.html">Meus anúncios</a><button class="text-button" id="logout">Sair</button>'
    : '<a href="login.html">Entrar</a><a class="button small" href="login.html?cadastro=1">Cadastrar-se</a>';

  document.querySelector("#header").innerHTML = `
    <div class="header-main container">
      <a class="brand" href="index.html" aria-label="iPet — página inicial">
        <span class="brand-icon" aria-hidden="true"></span>
        <span class="brand-name"><b>i</b>Pet</span>
      </a>
      <form class="header-search" action="anuncios.html">
        <span aria-hidden="true">⌕</span>
        <input name="q" aria-label="Buscar anúncios" placeholder="Busque por bairro, cidade, espécie ou características" />
      </form>
      <nav class="account-nav" aria-label="Acesso à conta">${areaDaConta}</nav>
    </div>
    <nav class="main-nav" aria-label="Menu principal">
      <a href="anuncios.html?tipo=perdido">Perdidos</a>
      <a href="anuncios.html?tipo=encontrado">Encontrados</a>
      <a href="index.html#como-funciona">Como funciona</a>
      <a href="index.html#sobre">Sobre</a>
      <a href="#contato">Contato</a>
    </nav>`;

  document.querySelector("#logout")?.addEventListener("click", () => {
    sairUsuario();
    location.href = "index.html";
  });
}

function montarRodape() {
  document.querySelector("#footer").innerHTML = `
    <div class="container footer-content" id="contato">
      <div class="footer-brand">
        <a class="brand" href="index.html" aria-label="iPet — página inicial">
          <span class="brand-icon" aria-hidden="true"></span>
          <span class="brand-name"><b>i</b>Pet</span>
        </a>
        <p>Conectando pets.<br />Unindo pessoas.</p>
      </div>
      <div><h2>Links úteis</h2><a href="anuncios.html?tipo=perdido">Perdidos</a><a href="anuncios.html?tipo=encontrado">Encontrados</a><a href="index.html#como-funciona">Como funciona</a></div>
      <div><h2>Institucional</h2><a href="index.html#sobre">Sobre o iPet</a><span>Projeto acadêmico</span><span>Sistemas de Informação</span></div>
      <div class="footer-message"><strong>Juntos por um mundo com<br />mais pets em casa. ♥</strong><span>© 2026 iPet</span></div>
    </div>`;
}

function urlSeguraDaImagem(url) {
  if (String(url).startsWith("assets/img/")) return url;
  if (String(url).startsWith("data:image/")) return url;
  return "";
}

function criarCard(anuncio) {
  const resolvido = anuncio.status === "resolvido";
  return `
    <article class="pet-card ${resolvido ? "card-resolvido" : ""}">
      <a class="card-photo" href="detalhes.html?id=${encodeURIComponent(anuncio.id)}">
        <img src="${urlSeguraDaImagem(anuncio.foto_url)}" alt="Foto de ${escaparHtml(nomeDoAnimal(anuncio))}" loading="lazy" />
        <span class="badge ${anuncio.tipo}">${anuncio.tipo === "perdido" ? "Perdido" : "Encontrado"}</span>
        ${resolvido ? '<span class="resolved-badge">Resolvido</span>' : ""}
      </a>
      <div class="card-body">
        <div class="card-title"><h3>${escaparHtml(nomeDoAnimal(anuncio))}</h3><span>${escaparHtml(anuncio.especie)}</span></div>
        <p class="location">⌖ ${escaparHtml(anuncio.bairro)} · ${escaparHtml(anuncio.cidade)}</p>
        <p class="pet-description">${escaparHtml(anuncio.descricao)}</p>
        <div class="card-bottom"><span>${formatarData(anuncio.data_ocorrencia)}</span><a href="detalhes.html?id=${encodeURIComponent(anuncio.id)}">Ver detalhes ↗</a></div>
      </div>
    </article>`;
}

function mostrarListaVazia(titulo) {
  return `<div class="empty"><span aria-hidden="true">⌕</span><h3>${titulo}</h3><p>Tente outros filtros ou publique um novo anúncio.</p></div>`;
}

function carregarInicio() {
  document.querySelector("#demo-notice").innerHTML = avisoDeDemonstracao();
  const recentes = obterAnuncios().slice(0, 6);
  document.querySelector("#cards").innerHTML = recentes.length
    ? recentes.map(criarCard).join("")
    : mostrarListaVazia("Ainda não há anúncios");
}

function carregarLista(apenasMeus = false) {
  document.querySelector("#demo-notice").innerHTML = avisoDeDemonstracao();
  if (apenasMeus) {
    document.querySelector(".page-title").textContent = "Meus anúncios";
    document.querySelector(".subtitle").textContent =
      "Edite, encerre ou exclua os anúncios publicados neste navegador.";
    document.querySelector(".eyebrow").textContent = "ÁREA DE DEMONSTRAÇÃO";
  }

  const formulario = document.querySelector("#filters");
  for (const [nome, valor] of parametros) {
    if (formulario.elements.namedItem(nome)) {
      formulario.elements.namedItem(nome).value = valor;
    }
  }
  formulario.status.value = parametros.get("status") || "";

  const anuncios = obterAnuncios().filter(
    (anuncio) => !apenasMeus || anuncio.meuAnuncio,
  );

  function atualizarLista() {
    const encontrados = filtrar(
      anuncios,
      Object.fromEntries(new FormData(formulario)),
    );
    document.querySelector("#count").textContent =
      `${encontrados.length} anúncio${encontrados.length === 1 ? "" : "s"} encontrado${encontrados.length === 1 ? "" : "s"}`;
    document.querySelector("#cards").innerHTML = encontrados.length
      ? encontrados.map(criarCard).join("")
      : mostrarListaVazia(
          apenasMeus
            ? "Você ainda não publicou nenhum anúncio"
            : "Nenhum anúncio encontrado",
        );
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    atualizarLista();
  });
  formulario.addEventListener("reset", () => setTimeout(atualizarLista));
  atualizarLista();
}

function prepararLogin() {
  const formulario = document.querySelector("#auth-form");
  const aviso = document.querySelector("#demo-notice");
  const botaoEntrar = document.querySelector("#signin");
  const botaoCadastrar = document.querySelector("#signup");
  let cadastro = parametros.get("cadastro") === "1";

  aviso.innerHTML =
    '<div class="demo"><span class="demo-dot"></span> Login demonstrativo <span>· Nenhuma senha real é armazenada.</span></div>';
  formulario.querySelector(
    'button[type="submit"], button:not([type])',
  ).disabled = false;

  function escolherAba(criarConta) {
    cadastro = criarConta;
    document.querySelector("#name-field").hidden = !cadastro;
    formulario.nome.required = cadastro;
    botaoEntrar.classList.toggle("active", !cadastro);
    botaoCadastrar.classList.toggle("active", cadastro);
    formulario.querySelector("button:last-child").textContent = cadastro
      ? "Criar conta"
      : "Entrar";
  }

  botaoEntrar.addEventListener("click", () => escolherAba(false));
  botaoCadastrar.addEventListener("click", () => escolherAba(true));
  escolherAba(cadastro);

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const email = formulario.email.value.trim();
    const nome = cadastro
      ? formulario.nome.value.trim()
      : email.split("@")[0] || "Visitante";
    salvarUsuario({ nome, email });
    location.href = "meus-anuncios.html";
  });
}

function carregarDetalhes() {
  const anuncio = buscarAnuncio(parametros.get("id"));
  if (!anuncio) {
    conteudo.innerHTML = `<section class="container section">${mostrarListaVazia("Anúncio não encontrado")}</section>`;
    return;
  }

  const campos = [
    ["Espécie", anuncio.especie],
    ["Raça", anuncio.raca],
    ["Cor", anuncio.cor],
    ["Porte", anuncio.porte],
    ["Sexo", anuncio.sexo],
    ["Data da ocorrência", formatarData(anuncio.data_ocorrencia)],
  ];

  conteudo.innerHTML = `
    <section class="container section">
      <a class="back" href="anuncios.html">← Voltar aos anúncios</a>
      ${avisoDeDemonstracao()}
      <div class="detail-layout">
        <img class="detail-photo" src="${urlSeguraDaImagem(anuncio.foto_url)}" alt="Foto de ${escaparHtml(nomeDoAnimal(anuncio))}" />
        <div>
          <span class="badge static ${anuncio.tipo}">${anuncio.tipo === "perdido" ? "Perdido" : "Encontrado"}</span>
          ${anuncio.status === "resolvido" ? '<span class="resolved">✓ Caso resolvido</span>' : ""}
          <h1 class="page-title">${escaparHtml(nomeDoAnimal(anuncio))}</h1>
          <p class="subtitle">⌖ ${escaparHtml(anuncio.bairro)} · ${escaparHtml(anuncio.cidade)}</p>
          <dl class="facts">${campos.map(([nome, valor]) => `<div><dt>${nome}</dt><dd>${escaparHtml(valor || "Não informado")}</dd></div>`).join("")}</dl>
          <h2 class="small-title">Sobre o animal</h2>
          <p class="preserve">${escaparHtml(anuncio.descricao)}</p>
          <p><strong>Características:</strong> ${escaparHtml(anuncio.caracteristicas || "Não informadas")}</p>
          <p><strong>Ponto de referência:</strong> ${escaparHtml(anuncio.referencia || "Não informado")}</p>
          <div class="contact"><h2 class="small-title">Contato</h2><p>${escaparHtml(anuncio.contato)}</p></div>
          ${anuncio.meuAnuncio ? `<div class="owner-actions"><a class="button secondary" href="publicar.html?id=${encodeURIComponent(anuncio.id)}">Editar</a>${anuncio.status === "ativo" ? '<button class="button" id="resolve">Marcar como resolvido</button>' : ""}<button class="text-button danger" id="delete">Excluir anúncio</button></div>` : ""}
        </div>
      </div>
    </section>`;

  document.querySelector("#resolve")?.addEventListener("click", () => {
    if (!confirm("Confirmar que este caso foi resolvido?")) return;
    marcarComoResolvido(anuncio.id);
    location.reload();
  });
  document.querySelector("#delete")?.addEventListener("click", () => {
    if (!confirm("Excluir este anúncio deste navegador?")) return;
    removerAnuncio(anuncio.id);
    location.href = "meus-anuncios.html";
  });
}

async function reduzirImagem(arquivo) {
  if (!arquivo) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }
  if (arquivo.size > 5 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }

  const endereco = URL.createObjectURL(arquivo);
  const imagem = new Image();
  imagem.src = endereco;
  await imagem.decode();

  const limite = 1000;
  const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  const desenho = canvas.getContext("2d");
  desenho.fillStyle = "#ffffff";
  desenho.fillRect(0, 0, canvas.width, canvas.height);
  desenho.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(endereco);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function prepararPublicacao() {
  const formulario = document.querySelector("#publish-form");
  const anuncio = parametros.has("id")
    ? buscarAnuncio(parametros.get("id"))
    : null;

  document.querySelector("#demo-notice").innerHTML = avisoDeDemonstracao();
  formulario.querySelector(
    'button[type="submit"], button:not([type])',
  ).disabled = false;

  if (anuncio) {
    if (!anuncio.meuAnuncio) {
      conteudo.innerHTML = `<section class="container section">${mostrarListaVazia("Este anúncio não pode ser editado")}</section>`;
      return;
    }
    document.querySelector(".page-title").textContent = "Editar anúncio";
    formulario.querySelector("button:last-child").textContent =
      "Salvar alterações";
    formulario.foto.required = false;
    document.querySelector(".upload small").textContent =
      "Escolha uma nova foto somente se quiser substituir a atual.";
    for (const [campo, valor] of Object.entries(anuncio)) {
      if (formulario.elements.namedItem(campo)) {
        formulario.elements.namedItem(campo).value = valor ?? "";
      }
    }
  }

  if (!anuncio && ["perdido", "encontrado"].includes(parametros.get("tipo"))) {
    formulario.tipo.value = parametros.get("tipo");
  }
  formulario.data_ocorrencia.max = new Date().toISOString().slice(0, 10);

  let enderecoDaPrevia;
  formulario.foto.addEventListener("change", () => {
    const arquivo = formulario.foto.files[0];
    const previa = document.querySelector("#preview");
    previa.hidden = !arquivo;
    if (enderecoDaPrevia) URL.revokeObjectURL(enderecoDaPrevia);
    if (arquivo) {
      enderecoDaPrevia = URL.createObjectURL(arquivo);
      previa.src = enderecoDaPrevia;
    }
  });

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const botao = formulario.querySelector("button:last-child");
    const mensagem = formulario.querySelector(".form-message");
    botao.disabled = true;
    mensagem.textContent = "Salvando…";

    try {
      const valores = Object.fromEntries(new FormData(formulario));
      const novaImagem = await reduzirImagem(formulario.foto.files[0]);
      const dados = {
        tipo: valores.tipo,
        nome_animal: valores.nome_animal.trim(),
        especie: valores.especie,
        raca: valores.raca.trim(),
        cor: valores.cor.trim(),
        porte: valores.porte,
        sexo: valores.sexo,
        descricao: valores.descricao.trim(),
        caracteristicas: valores.caracteristicas.trim(),
        cidade: valores.cidade.trim(),
        bairro: valores.bairro.trim(),
        referencia: valores.referencia.trim(),
        data_ocorrencia: valores.data_ocorrencia,
        contato: valores.contato.trim(),
        foto_url: novaImagem || anuncio?.foto_url,
      };

      const salvo = anuncio
        ? atualizarAnuncio(anuncio.id, dados)
        : adicionarAnuncio(dados);
      location.href = `detalhes.html?id=${encodeURIComponent(salvo.id)}`;
    } catch (erro) {
      mensagem.textContent =
        erro.name === "QuotaExceededError"
          ? "O navegador ficou sem espaço. Escolha uma imagem menor ou exclua anúncios antigos."
          : erro.message;
      botao.disabled = false;
    }
  });
}

function iniciar() {
  montarCabecalho();
  montarRodape();

  const paginas = {
    "index.html": carregarInicio,
    "anuncios.html": carregarLista,
    "detalhes.html": carregarDetalhes,
    "publicar.html": prepararPublicacao,
    "login.html": prepararLogin,
    "meus-anuncios.html": () => carregarLista(true),
  };
  paginas[pagina]?.();
}

iniciar();
