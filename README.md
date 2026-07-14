# Painel de Atendimentos

Projeto estático com duas páginas:

- `index.html`: consulta dos dados do arquivo JSON.
- `converter.html`: converte a aba **Base Consolidada** de um Excel em `atendimentos.json`.

## Atualização dos dados

1. Abra `converter.html` no site publicado.
2. Selecione o Excel criado com a aba **Base Consolidada**.
3. Clique em **Converter para JSON**.
4. Baixe o arquivo `atendimentos.json`.
5. Substitua `dados/atendimentos.json` no repositório do GitHub.
6. Faça o commit. O Vercel publicará a atualização automaticamente.

## Testar no computador

Por segurança do navegador, o `fetch` do JSON pode não funcionar ao abrir o HTML diretamente.
Na pasta do projeto, execute um servidor local, por exemplo:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`.

## Publicar no Vercel

Suba esta pasta para um repositório no GitHub e importe o repositório no Vercel.
Como é um site estático, não precisa de banco de dados nem configuração de build.


## Novo fluxo pelo Vercel

1. Abra o site publicado no Vercel.
2. Entre em **Converter Excel**.
3. Selecione o Excel com a aba **Base Consolidada**.
4. Clique em **Converter para JSON**.
5. Clique em **Usar estes dados no painel**.
6. O navegador salva os dados localmente e abre a página de consulta.

Os dados ficam disponíveis somente naquele navegador e computador. Para usar em outro dispositivo, basta repetir a conversão ou carregar um JSON.
