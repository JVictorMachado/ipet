let anuncios = [],
  usuario = null;
export async function api(path, method = "GET", body) {
  const response = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.erro || "Falha na operação.");
  return data;
}
export async function carregarDados() {
  [usuario, anuncios] = await Promise.all([api("/me"), api("/ads")]);
}
export const obterAnuncios = () => anuncios;
export const buscarAnuncio = (id) => anuncios.find((a) => a.id === id);
export const obterUsuario = () => usuario;
export const adicionarAnuncio = (dados) => api("/ads", "POST", dados);
export const atualizarAnuncio = (id, dados) => api("/ads/" + id, "PUT", dados);
export const marcarComoResolvido = (id) =>
  atualizarAnuncio(id, { status: "resolvido" });
export const removerAnuncio = (id) => api("/ads/" + id, "DELETE");
export const sairUsuario = () => api("/logout", "POST");
export const salvarUsuario = () => {
  throw new Error("Use o cadastro de conta.");
};
