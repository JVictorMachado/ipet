# iPet

Sistema local de animais perdidos e encontrados, com interface HTML/CSS/JavaScript e servidor Node.js com SQLite.

## Iniciar

Requer Node.js 24 ou superior. Nesta pasta execute `npm start` e abra http://localhost:3000. Não abra o HTML diretamente ou pelo Live Server: as contas e os anúncios precisam do servidor.

O servidor escuta apenas neste computador. Compartilhamento pela internet requer hospedagem pública com HTTPS e cookies seguros. Um link localhost funciona apenas no próprio computador.

## Funcionalidades

- Cadastro, login, logout e perfil com nome, e-mail, telefone e alteração de senha.
- Recuperação com código secreto entregue no cadastro. Guarde o código: cada recuperação gera outro e invalida o anterior. Não há envio por e-mail nem recuperação sem o código.
- Publicação, classificação, edição, exclusão e encerramento de anúncios por seu proprietário.
- Galeria com até seis fotos, remoção e escolha da capa.
- Meus anúncios e histórico de publicação, edição e encerramento. A exclusão é permanente.
- Pesquisa, filtros por características e localização, categorias e ordenação.
- Favoritos separados por conta: salvar, consultar e remover.
- Compartilhamento nativo ou cópia do link; cópia do contato e links de telefone/e-mail quando o campo tiver esses formatos.

## Dados

O banco fica em `data/ipet.sqlite`. Faça backup dessa pasta com o servidor parado. Senhas usam scrypt com salt aleatório; sessões usam cookies HttpOnly/SameSite e duram sete dias. O servidor verifica a propriedade dos anúncios antes de editar ou excluir.

Os dados anteriores continuam no localStorage, sem importação automática: não tinham vínculo confiável com uma conta. O novo banco começa vazio. O backend Java compilado na pasta superior não é usado.

## Testes

Execute `npm install`, depois `npm test` e `npm run test:browser`. O teste de navegador usa Microsoft Edge instalado. Os testes usam bancos temporários e não alteram o banco real. A captura móvel fica em `../artifacts/perfil-mobile.png`.
