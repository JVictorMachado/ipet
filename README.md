# iPet

MVP acadêmico para divulgação de animais perdidos e encontrados.

## Tecnologias

- HTML
- CSS
- JavaScript puro
- `localStorage` do navegador

O projeto não usa backend, API, banco de dados ou framework.

## Como abrir

No IntelliJ IDEA, abra `html/index.html` e use **Open in Browser**. O IntelliJ fornece apenas o endereço local necessário para os módulos JavaScript; toda a aplicação continua rodando no navegador.

Também é possível usar a extensão Live Server no VS Code.

## Dados

Na primeira abertura, `js/dados.js` fornece anúncios fictícios. Publicações, edições e o login demonstrativo ficam salvos no `localStorage` do navegador.

Se os dados do navegador forem apagados, os anúncios criados pelo usuário também serão removidos e os exemplos iniciais voltarão a aparecer.

As imagens enviadas são reduzidas antes de serem salvas para ocupar menos espaço. Como o `localStorage` tem limite, esta versão utiliza uma foto por anúncio.

## Estrutura

```text
ipet/
├── html/
│   ├── index.html
│   ├── anuncios.html
│   ├── detalhes.html
│   ├── publicar.html
│   ├── meus-anuncios.html
│   └── login.html
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

## Observações para a apresentação

O login é apenas visual e não armazena a senha. Os dados pertencem ao navegador usado na demonstração. Não existe sincronização entre computadores.
