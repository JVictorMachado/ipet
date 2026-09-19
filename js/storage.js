import { exemplos } from "./dados.js";

const CHAVE_ANUNCIOS = "ipet_anuncios";
const CHAVE_USUARIO = "ipet_usuario";

export function obterAnuncios() {
  const salvos = localStorage.getItem(CHAVE_ANUNCIOS);
  if (salvos) return JSON.parse(salvos);

  const iniciais = exemplos.map((anuncio) => ({
    ...anuncio,
    meuAnuncio: false,
  }));
  salvarLista(iniciais);
  return iniciais;
}

export function buscarAnuncio(id) {
  return obterAnuncios().find((anuncio) => String(anuncio.id) === String(id));
}

export function adicionarAnuncio(dados) {
  const anuncios = obterAnuncios();
  const novo = {
    ...dados,
    id: String(Date.now()),
    status: "ativo",
    meuAnuncio: true,
    created_at: new Date().toISOString(),
  };
  anuncios.unshift(novo);
  salvarLista(anuncios);
  return novo;
}

export function atualizarAnuncio(id, dados) {
  const anuncios = obterAnuncios();
  const indice = anuncios.findIndex(
    (anuncio) => String(anuncio.id) === String(id),
  );
  if (indice === -1) throw new Error("Anúncio não encontrado.");

  anuncios[indice] = { ...anuncios[indice], ...dados };
  salvarLista(anuncios);
  return anuncios[indice];
}

export function removerAnuncio(id) {
  const anuncios = obterAnuncios().filter(
    (anuncio) => String(anuncio.id) !== String(id),
  );
  salvarLista(anuncios);
}

export function marcarComoResolvido(id) {
  return atualizarAnuncio(id, { status: "resolvido" });
}

export function obterUsuario() {
  return JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "null");
}

export function salvarUsuario(usuario) {
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

export function sairUsuario() {
  localStorage.removeItem(CHAVE_USUARIO);
}

function salvarLista(anuncios) {
  localStorage.setItem(CHAVE_ANUNCIOS, JSON.stringify(anuncios));
}
