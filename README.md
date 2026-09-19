# iPet

MVP acadêmico para divulgação de animais perdidos e encontrados.

## Tecnologias

- HTML
- CSS
- JavaScript puro
- `localStorage` do navegador

O projeto não usa backend, API, banco de dados ou framework.

## Como abrir

No IntelliJ IDEA, abra `index.html` e use **Open in Browser** com o servidor interno da IDE. Também é possível usar a extensão Live Server no VS Code.

Não abra as páginas pelo endereço `file:///`. Nesse modo, o navegador pode separar o `localStorage` de cada arquivo e o login não será compartilhado entre as páginas.

A versão publicada está em [ipet-web-7mu.pages.dev](https://ipet-web-7mu.pages.dev/).

## Dados

Na primeira abertura, `js/dados.js` fornece anúncios fictícios. Publicações, edições e o login demonstrativo ficam salvos no `localStorage` do navegador.

Se os dados do navegador forem apagados, os anúncios criados pelo usuário também serão removidos e os exemplos iniciais voltarão a aparecer.

As imagens enviadas são reduzidas antes de serem salvas para ocupar menos espaço. Como o `localStorage` tem limite, esta versão utiliza uma foto por anúncio.

## Estrutura

```text
ipet/
├── index.html
├── anuncios.html
├── detalhes.html
├── publicar.html
├── meus-anuncios.html
├── login.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── dados.js
│   ├── filtros.js
│   └── storage.js
└── assets/
    ├── logo-ipet.png
    └── img/
```

## Fluxo de trabalho no Git

A branch `main` mantém a versão estável publicada no Cloudflare. Novas funcionalidades usam branches `feature/nome-da-funcionalidade` e correções usam `fix/nome-da-correcao`. As alterações são testadas antes de entrar na `main`, e os commits recebem a autoria e o `Signed-off-by` de JVictorMachado.
## Observações para a apresentação

O login é apenas visual e não armazena a senha. Os dados pertencem ao navegador usado na demonstração. Não existe sincronização entre computadores.
