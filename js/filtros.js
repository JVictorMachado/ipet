export function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filtrar(anuncios, filtros) {
  return anuncios.filter((anuncio) => {
    for (const campo of ["tipo", "especie", "porte", "sexo", "status"]) {
      if (filtros[campo] && anuncio[campo] !== filtros[campo]) return false;
    }

    for (const campo of ["raca", "cor"]) {
      if (
        filtros[campo] &&
        !normalizar(anuncio[campo]).includes(normalizar(filtros[campo]))
      ) {
        return false;
      }
    }

    if (filtros.data && anuncio.data_ocorrencia !== filtros.data) return false;

    const local = normalizar(
      `${anuncio.cidade} ${anuncio.bairro} ${anuncio.referencia}`,
    );
    if (filtros.local && !local.includes(normalizar(filtros.local)))
      return false;

    const texto = normalizar(
      [
        anuncio.nome_animal,
        anuncio.especie,
        anuncio.raca,
        anuncio.cor,
        anuncio.porte,
        anuncio.descricao,
        anuncio.caracteristicas,
        local,
      ].join(" "),
    );

    return normalizar(filtros.q)
      .split(/\s+/)
      .filter(Boolean)
      .every((palavra) => texto.includes(palavra));
  });
}
