import { api, carregarDados } from "./storage.js";
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

const nomeDaPagina = location.pathname.split("/").pop() || "index";
const pagina = nomeDaPagina.endsWith(".html")
  ? nomeDaPagina
  : `${nomeDaPagina}.html`;
const parametros = new URLSearchParams(location.search);
const conteudo = document.querySelector("main");
let usuario;

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
  return '<div class="demo"><span class="demo-dot"></span> Comunidade iPet <span>· Seus anúncios ficam salvos no servidor do iPet.</span></div>';
}

function montarCabecalho() {
  const areaDaConta = usuario
    ? '<a href="meus-anuncios.html">Meus anúncios</a><a href="favoritos.html">Favoritos</a><a href="perfil.html">Perfil</a><button class="text-button" id="logout">Sair</button>'
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

  document.querySelector("#logout")?.addEventListener("click", async () => {
    await sairUsuario();
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
      <div class="footer-message"><strong>Juntos por um mundo com<br />mais pets em casa.</strong><span>© 2026 iPet</span></div>
    </div>`;
}

function urlSeguraDaImagem(url) {
  const caminho = String(url);
  if (caminho.startsWith("../assets/img/")) return caminho.slice(3);
  if (caminho.startsWith("assets/img/")) return caminho;
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

function mostrarListaVazia(
  titulo,
  texto = "Tente outros filtros ou publique um novo anúncio.",
) {
  return `<div class="empty"><span aria-hidden="true">⌕</span><h3>${titulo}</h3><p>${texto}</p></div>`;
}

function carregarInicio() {
  document.querySelector("#demo-notice").innerHTML = avisoDeDemonstracao();

  if (usuario) {
    const chamada = document.querySelector(".home-cta");
    chamada.querySelector("h2").textContent = `Olá, ${usuario.nome}`;
    chamada.querySelector("p").textContent =
      "Acompanhe suas publicações ou crie um novo anúncio.";
    const linkDaConta = chamada.querySelector('a[href^="login.html"]');
    linkDaConta.href = "meus-anuncios.html";
    linkDaConta.textContent = "Meus anúncios";
  }

  const recentes = obterAnuncios().slice(0, 6);
  document.querySelector("#cards").innerHTML = recentes.length
    ? recentes.map(criarCard).join("")
    : mostrarListaVazia("Ainda não há anúncios");
}

function carregarLista(apenasMeus = false, apenasFavoritos = false) {
  if ((apenasMeus || apenasFavoritos) && !exigirLogin()) return;
  document.querySelector("#demo-notice").innerHTML = avisoDeDemonstracao();
  if (apenasMeus) {
    document.querySelector(".page-title").textContent = "Meus anúncios";
    document.querySelector(".subtitle").textContent =
      "Edite, encerre ou exclua os anúncios da sua conta e consulte o histórico.";
    document.querySelector(".eyebrow").textContent = "MINHA CONTA";
  }

  if (apenasFavoritos) {
    document.querySelector(".page-title").textContent = "Meus favoritos";
    document.querySelector(".subtitle").textContent =
      "Anúncios que você salvou para acompanhar.";
  }
  const formulario = document.querySelector("#filters");
  formulario.insertAdjacentHTML(
    "beforeend",
    `<label>Ordenar por<select name="ordem"><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option><option value="nome">Nome do animal</option><option value="ocorrencia">Data da ocorrência</option></select></label>`,
  );
  for (const [nome, valor] of parametros) {
    if (formulario.elements.namedItem(nome)) {
      formulario.elements.namedItem(nome).value = valor;
    }
  }
  formulario.status.value = parametros.get("status") || "ativo";

  const anuncios = obterAnuncios().filter(
    (anuncio) =>
      (!apenasMeus || anuncio.meuAnuncio) &&
      (!apenasFavoritos || anuncio.favorito),
  );

  function atualizarLista() {
    const encontrados = filtrar(
      anuncios,
      Object.fromEntries(new FormData(formulario)),
    );
    encontrados.sort((a, b) =>
      formulario.ordem.value === "nome"
        ? nomeDoAnimal(a).localeCompare(nomeDoAnimal(b), "pt-BR")
        : formulario.ordem.value === "antigos"
          ? a.created_at.localeCompare(b.created_at)
          : formulario.ordem.value === "ocorrencia"
            ? b.data_ocorrencia.localeCompare(a.data_ocorrencia)
            : b.created_at.localeCompare(a.created_at),
    );
    document.querySelector("#count").textContent =
      `${encontrados.length} anúncio${encontrados.length === 1 ? "" : "s"} encontrado${encontrados.length === 1 ? "" : "s"}`;
    document.querySelector("#cards").innerHTML = encontrados.length
      ? encontrados.map(criarCard).join("")
      : mostrarListaVazia(
          apenasMeus && anuncios.length === 0
            ? "Você ainda não publicou nenhum anúncio"
            : "Nenhum anúncio corresponde aos filtros",
          apenasMeus && anuncios.length === 0
            ? "Crie um anúncio para começar a usar esta pesquisa."
            : "Altere ou limpe os filtros para tentar novamente.",
        );
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    atualizarLista();
  });
  formulario.ordem.addEventListener("change", atualizarLista);
  formulario.addEventListener("reset", () => setTimeout(atualizarLista));
  atualizarLista();
}

function exigirLogin() {
  if (usuario) return true;
  location.href =
    "login.html?retorno=" +
    encodeURIComponent(location.pathname.split("/").pop() + location.search);
  return false;
}
function prepararLogin() {
  const form = document.querySelector("#auth-form");
  form.querySelector("button:last-child").disabled = false;
  let cadastro = parametros.get("cadastro") === "1";
  const aba = (value) => {
    cadastro = value;
    document.querySelector("#name-field").hidden = !value;
    form.nome.required = value;
    document.querySelector("#signin").classList.toggle("active", !value);
    document.querySelector("#signup").classList.toggle("active", value);
    form.querySelector("button:last-child").textContent = value
      ? "Criar conta"
      : "Entrar";
  };
  document.querySelector("#signin").onclick = () => aba(false);
  document.querySelector("#signup").onclick = () => aba(true);
  aba(cadastro);
  form.insertAdjacentHTML(
    "afterend",
    '<p><a href="recuperar.html">Esqueci minha senha</a></p>',
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const button = form.querySelector("button:last-child");
    button.disabled = true;
    try {
      const result = await api(
        cadastro ? "/register" : "/login",
        "POST",
        Object.fromEntries(new FormData(form)),
      );
      if (cadastro) {
        mostrarCodigo(
          result.codigo,
          () => (location.href = "meus-anuncios.html"),
        );
      } else {
        const next = parametros.get("retorno");
        location.href =
          next &&
          /^(publicar|meus-anuncios|favoritos|perfil)\.html(?:\?|$)/.test(next)
            ? next
            : "meus-anuncios.html";
      }
    } catch (err) {
      form.querySelector(".form-message").textContent = err.message;
    } finally {
      button.disabled = false;
    }
  };
}
function mostrarCodigo(codigo, continuar) {
  conteudo.innerHTML =
    '<section class="container section narrow"><h1>Guarde seu código de recuperação</h1><p>Este código permite redefinir sua senha. Salve em um local seguro. Ele não será exibido novamente.</p><p><code id="recovery-code"></code></p><button class="button" id="continue">Guardei o código, continuar</button></section>';
  document.querySelector("#recovery-code").textContent = codigo;
  document.querySelector("#continue").onclick = continuar;
}
function prepararRecuperacao() {
  conteudo.innerHTML =
    '<section class="container section narrow"><h1>Recuperar senha</h1><p>Use o código que você recebeu ao cadastrar sua conta.</p><form class="panel" id="recovery"><label>E-mail<input name="email" type="email" required></label><label>Código de recuperação<input name="codigo" required autocomplete="off"></label><label>Nova senha<input name="senha" type="password" minlength="8" maxlength="256" required autocomplete="new-password"></label><p role="status" class="form-message"></p><button class="button">Redefinir senha</button></form></section>';
  const f = document.querySelector("#recovery");
  f.onsubmit = async (e) => {
    e.preventDefault();
    f.querySelector("button").disabled = true;
    try {
      const r = await api(
        "/recover",
        "POST",
        Object.fromEntries(new FormData(f)),
      );
      mostrarCodigo(r.codigo, () => (location.href = "login.html"));
    } catch (err) {
      f.querySelector(".form-message").textContent = err.message;
    } finally {
      f.querySelector("button").disabled = false;
    }
  };
}
function prepararPerfil() {
  if (!exigirLogin()) return;
  conteudo.innerHTML =
    '<section class="container section narrow"><h1>Meu perfil</h1><form id="profile" class="panel"><label>Nome<input name="nome" required maxlength="150"></label><label>E-mail<input name="email" type="email" required maxlength="150"></label><label>Telefone<input name="telefone" maxlength="40"></label><label>Senha atual (para confirmar alterações)<input name="senhaAtual" type="password" required autocomplete="current-password"></label><label>Nova senha (opcional)<input name="senha" type="password" minlength="8" maxlength="256" autocomplete="new-password"></label><p class="form-message" role="status"></p><button class="button">Salvar perfil</button></form></section>';
  const f = document.querySelector("#profile");
  for (const k of ["nome", "email", "telefone"])
    f.elements[k].value = usuario[k] || "";
  f.onsubmit = async (e) => {
    e.preventDefault();
    f.querySelector("button").disabled = true;
    try {
      usuario = await api("/me", "PUT", Object.fromEntries(new FormData(f)));
      f.senha.value = "";
      f.senhaAtual.value = "";
      f.querySelector(".form-message").textContent = "Perfil atualizado.";
    } catch (err) {
      f.querySelector(".form-message").textContent = err.message;
    } finally {
      f.querySelector("button").disabled = false;
    }
  };
}

function carregarDetalhes() {
  const anuncio = buscarAnuncio(parametros.get("id"));
  if (!anuncio) {
    conteudo.innerHTML = `<section class="container section">${mostrarListaVazia("Anúncio não encontrado")}</section>`;
    return;
  }

  const podeGerenciar = Boolean(usuario && anuncio.meuAnuncio);
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
        <div class="detail-media"><img class="detail-photo" src="${urlSeguraDaImagem(anuncio.foto_url)}" alt="Foto de ${escaparHtml(nomeDoAnimal(anuncio))}" />
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
          <div class="owner-actions"><button class="button secondary" id="favorite">${anuncio.favorito ? "Remover dos favoritos" : "Favoritar"}</button><button class="button secondary" id="share">Compartilhar</button><button class="button secondary" id="contact">Copiar contato</button></div><p id="detail-message" role="status"></p>
          ${anuncio.meuAnuncio ? `<div class="owner-actions"><a class="button secondary" href="publicar.html?id=${encodeURIComponent(anuncio.id)}">Editar</a>${anuncio.status === "ativo" ? '<button class="button" id="resolve">Marcar como resolvido</button>' : ""}<button class="text-button danger" id="delete">Excluir anúncio</button></div>` : ""}
        </div>
      </div>
    </section>`;

  prepararAcoesDetalhes(anuncio);
  document.querySelector("#resolve")?.addEventListener("click", async () => {
    if (!confirm("Confirmar que este caso foi resolvido?")) return;
    try {
      await marcarComoResolvido(anuncio.id);
    } catch (e) {
      alert(e.message);
      return;
    }
    location.reload();
  });
  document.querySelector("#delete")?.addEventListener("click", async () => {
    if (!confirm("Excluir este anúncio permanentemente?")) return;
    try {
      await removerAnuncio(anuncio.id);
    } catch (e) {
      alert(e.message);
      return;
    }
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
  if (!exigirLogin()) return;
  const formulario = document.querySelector("#publish-form");
  formulario.foto.multiple = true;
  formulario.foto.required = false;
  document.querySelector(".upload small").textContent =
    "De 1 a 6 fotos. JPG, PNG ou WebP, até 5 MB por arquivo. A primeira será a capa.";
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
    formulario.querySelector('button[type="submit"]').textContent =
      "Salvar alterações";
    formulario.foto.required = false;
    formulario.consentimento.checked = true;
    document.querySelector(".upload small").textContent =
      "Adicione, remova ou escolha a foto de capa. Mantenha de 1 a 6 fotos.";
    for (const [campo, valor] of Object.entries(anuncio)) {
      if (formulario.elements.namedItem(campo)) {
        formulario.elements.namedItem(campo).value = valor ?? "";
      }
    }
  }

  if (!anuncio && ["perdido", "encontrado"].includes(parametros.get("tipo"))) {
    formulario.tipo.value = parametros.get("tipo");
  }
  formulario.data_ocorrencia.max = new Date().toLocaleDateString("en-CA");
  const gerenciarFotos = prepararFotos(formulario, anuncio);

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
      const fotos = await gerenciarFotos();
      if (!fotos.length) throw new Error("Adicione pelo menos uma foto.");
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
        fotos,
      };

      const salvo = anuncio
        ? await atualizarAnuncio(anuncio.id, dados)
        : await adicionarAnuncio(dados);
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

function prepararFotos(formulario, anuncio) {
  let fotos = [
    ...(anuncio?.fotos || (anuncio?.foto_url ? [anuncio.foto_url] : [])),
  ];
  let processando = Promise.resolve();
  const area = document.createElement("div");
  area.className = "photo-manager";
  document.querySelector(".upload").after(area);
  function render() {
    area.replaceChildren();
    fotos.forEach((url, i) => {
      const box = document.createElement("div");
      const img = document.createElement("img");
      img.src = urlSeguraDaImagem(url);
      img.alt = "Foto " + (i + 1);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remover foto " + (i + 1);
      remove.onclick = () => {
        fotos.splice(i, 1);
        render();
      };
      const cover = document.createElement("button");
      cover.type = "button";
      cover.textContent = i === 0 ? "Capa" : "Usar como capa";
      cover.disabled = i === 0;
      cover.onclick = () => {
        fotos.unshift(fotos.splice(i, 1)[0]);
        render();
      };
      box.append(img, remove, cover);
      area.append(box);
    });
  }
  formulario.foto.addEventListener("change", () => {
    const files = [...formulario.foto.files];
    processando = processando
      .then(async () => {
        if (fotos.length + files.length > 6)
          throw new Error(
            "O limite é de 6 fotos. Remova uma foto antes de adicionar outras.",
          );
        const novas = await Promise.all(files.map(reduzirImagem));
        fotos.push(...novas);
        render();
      })
      .catch((err) => {
        formulario.querySelector(".form-message").textContent = err.message;
      })
      .finally(() => {
        formulario.foto.value = "";
        document.querySelector("#preview").hidden = true;
      });
  });
  render();
  return async () => {
    await processando;
    return fotos.slice();
  };
}
function prepararAcoesDetalhes(anuncio) {
  const msg = document.querySelector("#detail-message");
  document.querySelector("#favorite").onclick = async () => {
    if (!exigirLogin()) return;
    try {
      await api(
        "/ads/" + anuncio.id + "/favorite",
        anuncio.favorito ? "DELETE" : "POST",
      );
      anuncio.favorito = !anuncio.favorito;
      document.querySelector("#favorite").textContent = anuncio.favorito
        ? "Remover dos favoritos"
        : "Favoritar";
      msg.textContent = anuncio.favorito
        ? "Anúncio salvo nos favoritos."
        : "Anúncio removido dos favoritos.";
    } catch (e) {
      msg.textContent = e.message;
    }
  };
  document.querySelector("#share").onclick = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: nomeDoAnimal(anuncio) + " — iPet",
          url: location.href,
        });
      } else {
        await navigator.clipboard.writeText(location.href);
        msg.textContent = "Link copiado para compartilhar.";
      }
    } catch (e) {
      if (e.name !== "AbortError")
        msg.textContent = "Copie o endereço desta página para compartilhar.";
    }
  };
  document.querySelector("#contact").onclick = async () => {
    try {
      await navigator.clipboard.writeText(anuncio.contato);
      msg.textContent = "Contato copiado.";
    } catch {
      msg.textContent = anuncio.contato;
    }
  };
  const contact = document.querySelector(".contact");
  const value = anuncio.contato.trim();
  let href = "";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) href = "mailto:" + value;
  else if (/^[+()\d\s.-]{8,30}$/.test(value))
    href = "tel:" + value.replace(/[^+\d]/g, "");
  if (href) {
    const a = document.createElement("a");
    a.className = "button";
    a.href = href;
    a.textContent = "Entrar em contato";
    contact.append(a);
  }
  const fotos = anuncio.fotos || [anuncio.foto_url];
  if (fotos.length > 1) {
    const gallery = document.createElement("div");
    gallery.className = "gallery";
    fotos.forEach((url, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", "Ver foto " + (i + 1));
      const img = document.createElement("img");
      img.src = urlSeguraDaImagem(url);
      img.alt = "Foto " + (i + 1);
      button.append(img);
      button.onclick = () =>
        (document.querySelector(".detail-photo").src = img.src);
      gallery.append(button);
    });
    document.querySelector(".detail-photo").after(gallery);
  }
  if (anuncio.meuAnuncio) {
    const section = document.createElement("section");
    const title = document.createElement("h2");
    title.textContent = "Histórico do anúncio";
    section.append(title);
    const list = document.createElement("ul");
    for (const event of anuncio.historico || []) {
      const li = document.createElement("li");
      li.textContent =
        event.acao + " — " + new Date(event.data).toLocaleString("pt-BR");
      list.append(li);
    }
    section.append(list);
    conteudo.querySelector(".container").append(section);
  }
}

async function iniciar() {
  try {
    await carregarDados();
    usuario = obterUsuario();
  } catch (e) {
    conteudo.innerHTML =
      '<section class="container section"><h1>Não foi possível conectar ao iPet</h1><p>Inicie o servidor com npm start e acesse http://localhost:3000.</p></section>';
    return;
  }
  montarCabecalho();
  montarRodape();

  const paginas = {
    "index.html": carregarInicio,
    "anuncios.html": carregarLista,
    "detalhes.html": carregarDetalhes,
    "publicar.html": prepararPublicacao,
    "login.html": prepararLogin,
    "perfil.html": prepararPerfil,
    "recuperar.html": prepararRecuperacao,
    "favoritos.html": () => carregarLista(false, true),
    "meus-anuncios.html": () => carregarLista(true),
  };
  paginas[pagina]?.();
}

iniciar();
