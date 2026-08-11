# Segurança de dependências

Registro do estado das vulnerabilidades conhecidas nas dependências do projeto,
para consulta em auditoria e para orientar as próximas correções.

**Última verificação:** 03/08/2026 (`npm audit`)
**Situação:** 22 vulnerabilidades → **6** (0 críticas em código alcançável)

---

## Corrigido

| Pacote | De | Para | Severidade | Motivo |
|---|---|---|---|---|
| `next-auth` | `5.0.0-beta.31` | `5.0.0-beta.32` | **Crítica** | Ver detalhe abaixo |
| `@auth/core` | `0.41.2` | `0.41.3` | **Crítica** | `getToken()` lança exceção não tratada em header `Bearer` malformado; normalização de e-mail permitindo bypass por homóglifo |
| `next` | `15.5.16` | `15.5.23` | Alta | Bypass de middleware/proxy no App Router; SSRF em Server Actions e rewrites; DoS; confusão de cache de resposta |
| `@auth/prisma-adapter` | `2.11.2` | **removido** | Alta | Dependência não utilizada — ver abaixo |
| Diversas transitivas | — | — | Alta/Moderada | `js-yaml`, `immutable`, `flatted`, `ajv`, `qs`, `path-to-regexp`, `nanoid`, `minimatch`, `picomatch`, `body-parser`, `eslint` |

### O caso crítico do `next-auth`

O aviso mais relevante era:

> *Auth.js: Configuration errors can cause existence-based auth checks to fail
> open (auth object populated with an error)* — afeta `>=5.0.0-beta.0 <=5.0.0-beta.31`

Este projeto estava exatamente na faixa afetada, e o padrão descrito é o que o
`src/middleware.ts` usa para proteger **todas** as rotas da aplicação:

```ts
if (!req.auth && !isPublic) {
  return NextResponse.redirect(new URL("/login", req.url));
}
```

É uma checagem por existência. Se um erro de configuração fizesse `req.auth` ser
preenchido com um objeto de erro (valor "verdadeiro"), a condição não dispararia
e a requisição seguiria **sem autenticação** para qualquer rota protegida.

`next-auth` está fixado em versão exata (`5.0.0-beta.32`, sem `^`) porque versões
beta não seguem semver de forma confiável — a atualização deve ser deliberada.

### Remoção do `@auth/prisma-adapter`

O pacote não era importado em nenhum ponto de `src/`, e o NextAuth está
configurado com `session.strategy: "jwt"` sem `adapter`, ou seja, não há
persistência de sessão em banco. Era a **única** origem do `@auth/core@0.41.2`
vulnerável na árvore.

> O modelo `Session` permanece em `prisma/schema.prisma` mas está igualmente sem
> uso. Sua remoção exige migração e foi deixada para uma limpeza separada.

---

## Pendências conhecidas

### 1. `xlsx` 0.18.5 — sem correção via npm ⚠️ prioridade

| | |
|---|---|
| **Avisos** | Prototype Pollution (`<0.19.3`, CVE-2023-30533) e ReDoS (`<0.20.2`, CVE-2024-22363) |
| **Severidade** | Alta |
| **Alcançável?** | **Sim** — `XLSX.read()` processa planilhas enviadas por usuário |
| **Mitigação atual** | O upload exige autenticação e perfil `ANALYST` ou superior (`ROLES_WRITE`). Não é vetor anônimo: exige conta válida na plataforma |

**Por que não foi corrigido:** a SheetJS deixou de publicar no npm em março de 2022
(`0.18.5` é a última lá, e o `dist-tag latest` ainda aponta para ela). As versões
corrigidas são distribuídas apenas pelo CDN próprio da SheetJS, inacessível a
partir do ambiente onde esta correção foi preparada.

**Procedimento de correção** (em ambiente com acesso a `cdn.sheetjs.com`):

```bash
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

**Pontos de atenção antes de aplicar:**

1. A superfície de API usada pelo projeto é pequena e estável entre 0.18 e 0.20
   (`read`, `write`, `utils.sheet_to_json`, `utils.json_to_sheet`, `utils.book_new`,
   `utils.book_append_sheet`, tipo `WorkSheet`) — não são esperadas quebras.
2. Passa a existir **dependência de rede externa no build**: o `npm ci` do
   Dockerfile precisará alcançar `cdn.sheetjs.com`. Se o ambiente de build for
   restrito, versionar o tarball no repositório é a alternativa.
3. Reprocessar um faturamento conhecido após a troca e conferir se o resultado
   da conciliação permanece idêntico.

### 2. `swiper` 11.2.6 — prototype pollution (crítica no aviso, baixa no contexto)

Faixa afetada `>=6.5.1 <12.1.2`; a correção é salto de major.

**Não é usado por nenhuma tela da Funcional** — aparece em 20 componentes que são
resíduo do template de origem (Hotel, NFT, Crypto, Real Estate, LMS…). São
carrosséis com conteúdo estático, sem entrada controlada por atacante, então o
vetor não é alcançável na prática.

A correção certa não é a atualização de major, e sim **remover as páginas de
template não utilizadas** — o que também reduz a superfície de ataque e o tamanho
do bundle. Fica como item de limpeza.

### 3. `next` / `postcss` / `sharp` — sinalização transitiva

Após a atualização para `15.5.23`, o `next` **não possui mais avisos diretos**.
Permanece sinalizado apenas por arrastar `postcss` e `sharp`, cuja correção o npm
só oferece via `next@16` (salto de major). Deve ser tratado em atualização
planejada, não como correção de segurança pontual.

### 4. `brace-expansion` — apenas ferramental

Chega pela cadeia do ESLint (`@eslint/eslintrc` → `minimatch@3`). É dependência de
desenvolvimento, não vai para o bundle de produção nem para a imagem final.

---

## Observação sobre o build

A atualização do Next passou a emitir aviso de que `bcryptjs` usa APIs do Node
(`process.nextTick`, `setImmediate`) não suportadas no Edge Runtime. A origem é
`src/middleware.ts` importar `@/lib/auth`, que importa `bcryptjs`.

**O aviso é benigno na prática:** o middleware apenas valida o JWT da sessão e
nunca executa `authorize()`, que é onde o `bcrypt.compare` é chamado. O
comportamento foi verificado de ponta a ponta (rota protegida sem sessão redireciona,
com sessão válida responde 200, com cookie adulterado redireciona).

A correção estrutural é o padrão de configuração dividida do NextAuth v5
(`auth.config.ts` sem providers para o middleware, configuração completa apenas no
runtime Node). Fica registrado como melhoria.

---

## Como reverificar

```bash
npm audit                    # panorama
npm audit --json             # detalhe por aviso, com faixas afetadas
npm ls <pacote>              # descobrir quem puxa uma transitiva
```

Recomendado automatizar no pipeline de CI, conforme a Fase 1 do plano de adequação
descrito em `docs/questionario-avaliacao-software.md`.
