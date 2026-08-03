# Questionário de Avaliação de Software — Plataforma de Faturamento e Conciliação

**Empresa:** Funcional Farma
**Sistema:** Plataforma de Faturamento e Conciliação (codinome técnico: `funcional-farma`)
**Versão:** 1.0.0
**Data do documento:** 03/08/2026
**Responsável técnico:** Equipe de desenvolvimento da plataforma

---

## 0. Resumo executivo

Este documento responde ao questionário de avaliação de software enviado pelo cliente, separando de forma explícita:

- ✅ **JÁ TEMOS** — implementado e verificável no código-fonte hoje;
- 🟡 **DEPENDE DE DEFINIÇÃO DE INFRAESTRUTURA** — a plataforma suporta, mas o item é decidido no momento do provisionamento (hospedagem, banco, backup);
- 🔧 **PODEMOS IMPLANTAR** — não existe hoje, é tecnicamente viável, com estimativa de esforço;
- ⚪ **NÃO APLICÁVEL** — a pergunta pressupõe um fornecedor externo de software de prateleira, o que não é o caso.

> **Observação de contexto, importante para a leitura de todo o documento:** este questionário foi desenhado para avaliar a **aquisição de um software de terceiros**. A plataforma em questão é um **sistema proprietário desenvolvido sob medida para a Funcional Farma**, cujo código-fonte pertence à Funcional Farma. Por isso, várias perguntas ("possui fornecedor?", "possui NDA?", "compartilhar relatório de pentest da empresa") mudam de natureza: não há um terceiro a ser auditado — a Funcional Farma é, simultaneamente, contratante, controladora dos dados e proprietária do código. Onde isso ocorre, respondemos a **pergunta equivalente** que faz sentido no contexto, em vez de deixar o campo vazio.

### 0.1 Quadro-síntese

| # | Item avaliado | Status |
|---|---|---|
| 1 | Nome do software | ✅ |
| 2 | Necessidade / justificativa | ✅ |
| 3 | Licença paga | ✅ Não requer |
| 4 | Aprovação do gestor | 🟡 Processo interno |
| 5 | Software compatível já em uso | ✅ Substitui processo manual em Excel |
| 6 | Uso por 1 ou mais pessoas | ✅ Multiusuário com RBAC |
| 7 | 1 ou mais departamentos | ✅ Multidepartamental |
| 8 | Fornecedor de suporte | ✅ Equipe de desenvolvimento |
| 9 | Service Desk responsável pelo suporte | 🔧 A definir em conjunto |
| 10 | Restrições de uso corporativo | ✅ Nenhuma |
| 11 | Logs de auditoria e segurança | ✅ Parcial — falta login/logout 🔧 |
| 12 | Criptografia em trânsito | ✅ TLS + HSTS |
| 13 | Criptografia em repouso | 🟡 Infra + 🔧 camada aplicacional |
| 14 | Dados pessoais / sensíveis | ✅ Pseudonimizados por design |
| 15 | Concessão e revogação de usuários | ✅ Implementado |
| 16 | Integração com AD / Azure AD | 🔧 Não implementado — viável |
| 17 | Integração com outros sistemas | ✅ Via arquivo (Autorizador / Proteus) |
| 18 | Disponibilidade ≥ 99,5% | 🟡 Depende da topologia contratada |
| 19 | Garantia de backups | 🟡 Infra + 🔧 rotina automatizada |
| 20 | Localização geográfica dos dados | 🟡 Recomendamos Brasil |
| 21 | Instalação em VM / servidor / cloud | ✅ Container Docker |
| 22 | Arquitetura da solução | ✅ Documentada abaixo |
| 23 | NDA com a Funcional | ⚪ / 🟡 |
| 24 | Necessidade de POC | ✅ MVP já em operação |
| 25 | Política de privacidade | ✅ Publicada em `/privacidade` |
| 26 | Relatório de pentest | 🔧 Não realizado — recomendado |
| — | **Questionário de IA** | ⚪ **Não aplicável — o sistema não utiliza IA** |

---

## 1. Identificação, necessidade e governança

### 1.1 Qual o nome do software?

**Resposta:** Plataforma de Faturamento e Conciliação — Funcional Farma.

Identificador técnico do pacote: `funcional-farma`, versão `1.0.0`. É um sistema web interno, de uso exclusivo da Funcional Farma, sem nome comercial de mercado por não ser um produto de prateleira.

✅ **Já temos.** 🔧 **Podemos implantar:** caso o cliente prefira um nome comercial formal para registro no catálogo de aplicações corporativas, definimos e aplicamos em interface, documentação e metadados em menos de 1 dia.

---

### 1.2 Qual a necessidade, justificativa?

**Resposta:** O sistema automatiza o processo de faturamento e conciliação de atendimentos entre a base do **Autorizador (Johnson & Johnson)** e a base do **Proteus (ERP interno)**, que hoje é executado manualmente em planilhas Excel.

**Problema atual (processo manual):**

- Cruzamento manual, via PROCV, de duas planilhas com milhares de linhas por ciclo de faturamento;
- Risco elevado de erro humano em conferência de valores, notas fiscais, CNPJ e razão social;
- Retrabalho recorrente por reenvio de procedimentos já faturados em ciclos anteriores;
- Ausência de rastreabilidade: não se sabe quem alterou o quê, nem quando;
- Tempo de fechamento longo e dependente de pessoas específicas (risco de continuidade operacional).

**O que o sistema entrega hoje (✅ já implementado):**

| Capacidade | Descrição |
|---|---|
| Ingestão de arquivos | Upload das planilhas do Autorizador e do Proteus (`.xlsx`, `.xls`, `.csv`, até 50 MB cada) |
| Limpeza e normalização | Rotinas dedicadas por origem (`limparAutorizador`, `limparProteus`) |
| Deduplicação histórica | Bloqueio automático de vouchers já faturados em períodos anteriores |
| Conciliação automática | Match primário por nota fiscal normalizada, com fallback por código de ordem de pagamento |
| Detecção de divergências | 8 tipos catalogados (abaixo) |
| Tratativa de divergências | Fluxo de resolução com registro de responsável, data e notas |
| Exportação | Geração de planilhas nos formatos "Funcional" e "Proteus", com segmentação Grandes Redes × Convencionais |
| Análises | Painéis por ano, por clínica e por medicamento |
| Trilha de auditoria | Registro das operações sensíveis com usuário, entidade, IP e timestamp |

**Tipos de divergência detectados automaticamente:**
`LINHA_FALTANTE`, `VALOR_DIVERGENTE` (tolerância de R$ 0,01), `NF_ABREVIADA`, `CNPJ_DIFERENTE`, `RAZAO_SOCIAL_DIFERENTE`, `LOTE_AUSENTE`, `VOUCHER_SEM_FINALIZACAO`, `OUTRO`.

**Benefícios diretos:** redução do tempo de fechamento, eliminação de erros de digitação e de PROCV, rastreabilidade completa para auditoria e conformidade com a LGPD por desenho (não trafegam nome nem CPF de paciente).

---

### 1.3 Requer licença paga ou não?

**Resposta:** ❌ **Não.** Não há licença de software a ser paga.

✅ **Já temos.** Toda a stack é composta por software livre com licenças permissivas (MIT / Apache 2.0), sem custo por usuário, por servidor ou por volume:

| Componente | Função | Licença |
|---|---|---|
| Next.js 15 / React 19 | Framework de aplicação | MIT |
| TypeScript 5 | Linguagem | Apache 2.0 |
| PostgreSQL | Banco de dados | PostgreSQL License (BSD-like) |
| Prisma ORM 6 | Acesso a dados e migrações | Apache 2.0 |
| NextAuth v5 (Auth.js) | Autenticação | ISC |
| Tailwind CSS 4 | Interface | MIT |
| SheetJS (`xlsx`) | Leitura e escrita de planilhas | Apache 2.0 |
| Node.js 22 / Docker | Runtime e empacotamento | MIT / Apache 2.0 |

**Os únicos custos recorrentes são de infraestrutura** (servidor/VM, banco de dados gerenciado, armazenamento de backup e certificado TLS — este último gratuito via Let's Encrypt). Não há dependência de nenhum serviço SaaS externo pago: a política de segurança da aplicação (CSP) restringe conexões de saída à própria origem.

🔧 **Podemos implantar:** um relatório de inventário de licenças (SBOM — *Software Bill of Materials*, formato CycloneDX ou SPDX) gerado automaticamente no pipeline de build, para comprovação formal de compliance de licenciamento perante auditoria. **Esforço: 1 dia.**

---

### 1.4 Aprovação do gestor?

**Resposta:** 🟡 Item de processo interno da Funcional Farma — depende da formalização pelo gestor da área demandante (Faturamento) e pelo gestor de TI.

O desenvolvimento foi conduzido a partir de demanda da área de negócio, com o escopo funcional derivado do processo real de faturamento documentado pela própria equipe. Cabe à Funcional Farma registrar a aprovação no fluxo formal de governança de aplicações.

🔧 **Podemos implantar:** documento de escopo funcional consolidado (com o mapeamento processo-atual → processo-automatizado) para instruir a aprovação formal. **Esforço: 2 dias.**

---

### 1.5 Já tenho em uso um software/aplicativo compatível?

**Resposta:** **Não existe software equivalente em uso.** O processo é executado hoje em **Microsoft Excel, de forma manual**.

A plataforma não substitui nem duplica nenhum sistema corporativo existente:

- **Não substitui o Proteus (ERP):** o Proteus permanece como sistema-fonte das ordens de pagamento. A plataforma o consome como entrada;
- **Não substitui o Autorizador (J&J):** sistema de terceiro, permanece como fonte de autorizações. A plataforma o consome como entrada;
- **Substitui, sim,** as planilhas manuais de conciliação e os PROCVs de deduplicação histórica.

Ou seja, a plataforma se posiciona **entre** dois sistemas já existentes, automatizando exatamente a etapa que hoje é manual. Não há sobreposição de licenças nem de funcionalidades com o parque atual.

---

### 1.6 Esta solicitação é apenas para uso de 1 ou mais pessoas?

**Resposta:** ✅ **Mais de uma pessoa.** O sistema é multiusuário desde a concepção, com controle de acesso baseado em papéis (RBAC).

**Perfis implementados (✅ já temos):**

| Perfil | Permissões |
|---|---|
| `ADMIN` | Acesso total, incluindo gestão de usuários e visualização da trilha de auditoria |
| `SUPERVISOR` | Criação e gestão de faturamentos, resolução de divergências, exportação |
| `ANALYST` | Criação de faturamentos, tratativa de divergências, exportação |
| `VIEWER` | Somente leitura e exportação |

Cada usuário possui credencial individual e nominal — não há uso de conta compartilhada. Todas as ações sensíveis são atribuídas ao usuário autenticado na trilha de auditoria.

🔧 **Podemos implantar:** perfis customizados com permissões granulares por módulo (faturamento, análises, cadastros), caso a estrutura de quatro papéis se mostre insuficiente. **Esforço: 3 a 5 dias.**

---

### 1.7 Esta solicitação é para 1 ou mais departamentos?

**Resposta:** ✅ **Mais de um departamento.**

| Departamento | Uso previsto |
|---|---|
| **Faturamento** | Usuário principal — upload, conciliação, tratativa de divergências e exportação |
| **Financeiro / Controladoria** | Consulta de valores conciliados, divergências e análises por período |
| **Comercial / Relacionamento** | Análises por clínica e por medicamento, acompanhamento de grandes redes |
| **TI** | Administração de usuários, monitoramento e sustentação |
| **Compliance / Auditoria** | Consulta da trilha de auditoria (perfil somente leitura) |

O modelo de RBAC já suporta esta segmentação sem desenvolvimento adicional.

---

### 1.8 Possui um fornecedor para suporte ao aplicativo/software?

**Resposta:** ✅ **Sim — a equipe de desenvolvimento responsável pela plataforma.**

Como o sistema é proprietário da Funcional Farma, não há dependência de fornecedor de software de prateleira. O suporte é prestado pela equipe que desenvolveu a solução, com **acesso integral ao código-fonte**, o que elimina o risco de dependência de roadmap de terceiro (*vendor lock-in*) e permite correções e evoluções sob demanda.

**O que já existe:** código-fonte versionado em Git, com histórico completo de alterações; documentação técnica no repositório; ambiente de build reproduzível via Docker.

🔧 **Podemos implantar:**

- **Contrato de suporte com SLA formal** (níveis de severidade, prazos de resposta e de solução, janela de atendimento, canal de acionamento). **Esforço: definição contratual — 1 semana de alinhamento.**
- **Runbook operacional** para a equipe de sustentação: procedimentos de deploy, rollback, restauração de backup, diagnóstico dos erros mais comuns do pipeline de conciliação. **Esforço: 3 dias.**
- **Plano de transferência de conhecimento** para internalização do suporte pela TI da Funcional Farma. **Esforço: 1 semana.**

---

### 1.9 Equipe de Service Desk será responsável pelo suporte no aplicativo/software?

**Resposta:** 🔧 **A definir em conjunto com a TI da Funcional Farma.** Nossa recomendação é um modelo de suporte em três níveis:

| Nível | Responsável | Escopo |
|---|---|---|
| **N1** | Service Desk da Funcional Farma | Dúvidas de uso, reset de senha, desbloqueio de conta, orientação sobre divergências, triagem inicial |
| **N2** | TI / Infraestrutura da Funcional Farma | Indisponibilidade, performance, restauração de backup, gestão de acessos, monitoramento |
| **N3** | Equipe de desenvolvimento | Defeitos de código, regras de conciliação, evolução funcional |

Este modelo pressupõe capacitação prévia do N1.

🔧 **Podemos implantar:**

- **Base de conhecimento para o Service Desk** com os 15 a 20 cenários mais frequentes e roteiros de resolução. **Esforço: 3 dias.**
- **Treinamento do N1** (sessão de 2 a 3 horas, com gravação). **Esforço: 2 dias, incluindo preparação.**
- **Manual do usuário final** ilustrado, cobrindo o ciclo completo de faturamento. **Esforço: 3 a 4 dias.**
- **Integração com a ferramenta de ITSM** já usada pela Funcional Farma, para abertura automática de chamado a partir de erro na aplicação. **Esforço: 3 a 5 dias, dependendo da API da ferramenta.**

---

### 1.10 Possui restrições ou limitações do uso do software/aplicativo para corporações?

**Resposta:** ✅ **Não há nenhuma restrição.**

- **Licenciamento:** todas as dependências usam licenças permissivas (MIT, Apache 2.0, ISC, BSD) que autorizam expressamente o uso comercial e corporativo. Não há nenhuma dependência sob licença copyleft forte (GPL/AGPL) que pudesse impor obrigações de abertura de código;
- **Usuários:** sem limite técnico ou contratual de número de usuários;
- **Volume:** sem limite de transações, faturamentos ou registros — a capacidade é função apenas do dimensionamento do banco de dados;
- **Território:** sem restrição geográfica de uso;
- **Propriedade:** o código-fonte é da Funcional Farma, que pode modificá-lo, hospedá-lo onde desejar e descontinuá-lo sem penalidade.

🔧 **Podemos implantar:** relatório automatizado de conformidade de licenças no pipeline de CI, com bloqueio de build caso uma dependência com licença incompatível seja introduzida. **Esforço: 1 a 2 dias.**

---

## 2. Segurança da informação

### 2.1 Possui logs de auditoria e segurança? Todas as transações necessárias são registradas em logs (login/logout e logs de alteração)?

**Resposta:** ✅ **Sim para logs de alteração** — implementados e consultáveis. 🔧 **Parcialmente para login/logout** — esta é uma lacuna real e assumida, com correção já dimensionada.

#### ✅ O que já temos

Existe uma trilha de auditoria persistida em banco (tabela `AuditLog`), imutável pela aplicação, com os seguintes campos por evento:

| Campo | Conteúdo |
|---|---|
| `userId` | Usuário autor da ação (vínculo com a tabela de usuários) |
| `action` | Ação executada (ex.: `faturamento.create`, `usuario.criar`) |
| `entity` / `entityId` | Entidade e registro afetados |
| `meta` | Contexto adicional em JSON (ex.: período, nomes dos arquivos, perfil atribuído) |
| `ip` | Endereço IP de origem, extraído de `X-Forwarded-For` / `X-Real-IP` |
| `createdAt` | Data e hora do evento |

**Eventos hoje auditados:**

| Evento | Ação registrada |
|---|---|
| Criação de faturamento (com upload) | `faturamento.create` — inclui nomes dos arquivos e período |
| Exclusão de faturamento | registrado |
| Exportação de planilha | `faturamento.export` — inclui tipo e categoria exportada |
| Resolução de divergência | registrado, com autor e notas |
| Criação de usuário | `usuario.criar` |
| Alteração de usuário (perfil / status) | registrado |
| Desativação de usuário | registrado |
| Alteração de dados de perfil | registrado |
| Alteração de senha | registrado |

Existe **interface de consulta da trilha** em `Configurações → Audit Log`, restrita ao perfil `ADMIN`.

**Controles complementares de segurança já ativos:**

- **Rate limiting no login**, persistido em banco: máximo de 20 tentativas por IP em 15 minutos e 10 tentativas por e-mail em 1 hora — mitigação de força bruta e *credential stuffing*;
- **Cabeçalhos de segurança HTTP** aplicados a todas as rotas: `Strict-Transport-Security` (HSTS, 2 anos, com `preload`), `Content-Security-Policy` restritiva, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (câmera, microfone e geolocalização bloqueados);
- **Middleware de autenticação global**: todas as rotas exigem sessão válida, exceto login, política de privacidade e termos de uso;
- **Autorização verificada no servidor** em cada endpoint de API, por perfil — não há confiança em validação de front-end;
- **Sessão com expiração de 8 horas** e renovação a cada hora.

#### 🔧 O que podemos implantar

| Lacuna | Solução proposta | Esforço |
|---|---|---|
| **Login bem-sucedido não é auditado** | Registrar evento `auth.login` com usuário, IP e *user agent* | 1 dia |
| **Tentativa de login malsucedida não é auditada** | Registrar `auth.login_failed` com e-mail tentado, IP e motivo (senha inválida, usuário inativo, rate limit) — essencial para detecção de ataque | 1 dia |
| **Logout não é auditado** | Registrar `auth.logout` | 0,5 dia |
| **Bloqueio por rate limit não gera alerta** | Registrar `auth.rate_limited` e disparar notificação | 1 dia |
| **Acesso de leitura a dados sensíveis não é auditado** | Registrar consultas a listagens de pedidos e a relatórios | 2 dias |
| **Retenção da trilha não é definida** | Política de retenção configurável (sugestão: 5 anos) com arquivamento automático | 2 dias |
| **Trilha não é exportável** | Exportação em CSV/JSON assinado, para entrega em auditoria | 1 dia |

**Total estimado para fechar a lacuna de auditoria: 8 a 9 dias.** Os três primeiros itens (login, falha de login e logout) são os mais críticos e podem ser entregues isoladamente em **2 a 3 dias**.

---

### 2.2 É usada criptografia dos dados, em especial em sua transferência?

**Resposta:** ✅ **Sim.**

#### ✅ O que já temos

- **TLS 1.2/1.3 obrigatório** em todo o tráfego entre navegador e aplicação;
- **HSTS com `max-age` de 2 anos, `includeSubDomains` e `preload`** — o navegador passa a recusar qualquer conexão em texto claro com o domínio, mesmo antes da primeira requisição, eliminando a janela de ataque de *downgrade*;
- **Cookies de sessão com atributos `Secure`, `HttpOnly` e `SameSite`**, aplicados automaticamente em produção — o token de sessão não é acessível por JavaScript nem trafega fora de HTTPS;
- **CSP com `connect-src 'self'`** — a aplicação está impedida, por política do navegador, de enviar dados para qualquer host externo, o que barra exfiltração via script injetado;
- **`form-action 'self'`** — formulários não podem ser submetidos para domínios externos;
- **Senhas nunca trafegam nem são armazenadas em texto claro**: são processadas com bcrypt (fator de custo 12) e apenas o hash é persistido.

#### 🟡 Depende da infraestrutura

A terminação TLS ocorre no proxy reverso à frente do container. Recomendamos e podemos configurar: certificado válido com renovação automática, TLS 1.2 como mínimo, *cipher suites* modernas e desabilitação de renegociação insegura.

#### 🔧 O que podemos implantar

| Item | Descrição | Esforço |
|---|---|---|
| **TLS na conexão com o banco** | Forçar `sslmode=require` (ou `verify-full`) entre aplicação e PostgreSQL | 0,5 dia |
| **mTLS interno** | Autenticação mútua entre aplicação e banco, caso trafeguem em redes distintas | 2 dias |
| **Validação externa** | Teste de configuração TLS (SSL Labs ou equivalente) com meta de nota A+ e relatório anexável | 0,5 dia |
| **Monitoramento de expiração de certificado** | Alerta automático com 30 dias de antecedência | 0,5 dia |

---

### 2.3 É usada criptografia dos dados, em especial em repouso?

**Resposta:** 🟡 **Parcialmente — e este é o principal ponto de atenção técnico do documento.** Respondemos com transparência: **não há hoje criptografia em repouso implementada na camada da aplicação.**

#### ✅ O que já temos

- **Senhas com hash bcrypt, fator de custo 12** — não é criptografia reversível, é hash com *salt* individual por senha, que é o tratamento correto para credenciais (não devem ser recuperáveis);
- **Pseudonimização por desenho**: o banco não armazena nome, CPF, endereço ou qualquer identificador direto de paciente. São persistidos apenas códigos opacos (`BR-A` / `DSP`) gerados pelo sistema da Johnson & Johnson. Isso reduz drasticamente o impacto de um eventual vazamento do banco;
- **Arquivos enviados não são persistidos de forma duradoura**: o processamento ocorre a partir de *buffers* em memória; a cópia em disco é apenas um respaldo temporário em `/tmp/uploads/<uuid>`, dentro do container, e se perde a cada reinício. Nenhuma planilha original permanece armazenada;
- **Exclusão de planilhas do versionamento**: o `.gitignore` bloqueia explicitamente `*.xlsx`, `*.xls`, `*.csv` e o diretório `uploads/`, impedindo que dados reais sejam commitados por engano;
- **Container executado com usuário não privilegiado** (UID 1001, sem root), limitando o alcance de uma eventual evasão de processo.

#### 🟡 Depende da infraestrutura (recomendação nossa)

| Camada | Recomendação |
|---|---|
| **Volume do banco** | Criptografia de disco (LUKS em VM própria; ou criptografia gerenciada nativa em RDS/Cloud SQL/Azure Database, que é padrão nesses serviços) |
| **Backups** | Criptografia dos artefatos de backup em repouso e no transporte |
| **Volume do container** | Criptografia do sistema de arquivos do host |

Em qualquer provedor de banco gerenciado (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL), a criptografia em repouso com AES-256 já é entregue por padrão e atende ao requisito com **zero desenvolvimento**. Esta é a rota que recomendamos.

#### 🔧 O que podemos implantar (camada aplicacional)

| Item | Descrição | Esforço |
|---|---|---|
| **Criptografia em nível de coluna** | AES-256-GCM em campos financeiros e identificadores sensíveis, via extensão de criptografia do Prisma, com chave em cofre externo | 5 a 8 dias |
| **Gestão de chaves (KMS)** | Integração com AWS KMS, Azure Key Vault ou HashiCorp Vault, com rotação periódica de chaves | 3 a 5 dias |
| **Criptografia dos uploads temporários** | Cifrar o respaldo em `/tmp` antes da escrita | 1 dia |
| **Expurgo automático de uploads** | Rotina de limpeza dos arquivos temporários após o processamento, sem depender do reinício do container | 1 dia |
| **PostgreSQL TDE / `pgcrypto`** | Criptografia transparente ou seletiva no próprio banco | 2 a 3 dias |

**Recomendação prática:** adotar banco gerenciado com criptografia nativa (custo zero de desenvolvimento) e, adicionalmente, implantar o expurgo automático de uploads (1 dia). A criptografia em nível de coluna só se justifica se houver exigência regulatória específica, pois tem custo de performance em consultas e relatórios.

---

### 2.4 Haverá manipulação de dados pessoais/sensíveis ou confidencial?

**Resposta:** ✅ **Sim, com mitigação estrutural.** O sistema trata dados **pessoais** e **confidenciais de negócio**, mas **não trata dados pessoais sensíveis de pacientes** na acepção do art. 5º, II da LGPD (dado referente a saúde vinculado a pessoa identificada).

#### Inventário de dados tratados

| Categoria | Dados | Classificação LGPD |
|---|---|---|
| **Usuários do sistema** | Nome, e-mail corporativo, perfil, hash de senha, IP de acesso | Dado pessoal (art. 5º, I) |
| **Pacientes** | Código opaco `BR-A` / `DSP`, nome do exame, medicamento, data de infusão | **Pseudonimizado** — sem identificador direto |
| **Clínicas** | CNPJ, razão social, nome fantasia, cidade, estado | Dado de pessoa jurídica — fora do escopo da LGPD |
| **Financeiro** | Valores unitários e totais, notas fiscais, ordens de pagamento, lotes | Confidencial de negócio |

#### ✅ Medidas de proteção já implementadas

1. **Pseudonimização na origem (medida mais relevante):** o modelo de dados **não possui campo para nome, CPF ou endereço de paciente**. Isso não é uma configuração que possa ser desfeita por operação — é uma restrição estrutural do esquema do banco. O comentário no próprio código registra a intenção: *"BR-A ou DSP (nunca nome/CPF direto — LGPD)"*. Um vazamento integral do banco não expõe a identidade de nenhum paciente sem acesso concomitante à base da Johnson & Johnson;
2. **Minimização (art. 6º, III):** apenas os campos necessários à conciliação financeira são persistidos;
3. **Controle de acesso por perfil**, verificado no servidor em cada requisição;
4. **Trilha de auditoria** das operações sobre os dados;
5. **Política de privacidade publicada** em `/privacidade`, com bases legais declaradas;
6. **Termos de uso publicados** em `/termos`;
7. **Bloqueio de indexação e de vazamento por referência**: `Referrer-Policy: strict-origin-when-cross-origin` impede que URLs internas vazem para terceiros.

#### Bases legais declaradas (art. 7º LGPD)

- Execução de contrato (faturamento J&J) — art. 7º, V;
- Cumprimento de obrigação legal e regulatória — art. 7º, II;
- Legítimo interesse do controlador, limitado ao estritamente necessário — art. 7º, IX.

#### 🔧 O que podemos implantar

| Item | Descrição | Esforço |
|---|---|---|
| **RIPD / DPIA** | Relatório de Impacto à Proteção de Dados Pessoais formal (art. 38 LGPD) | 5 dias, com apoio do DPO |
| **Registro das operações de tratamento** | Documento do art. 37 LGPD (ROPA) | 3 dias |
| **Fluxo de atendimento ao titular** | Rotina para as requisições do art. 18 (acesso, correção, eliminação, portabilidade), com prazo e registro | 3 a 5 dias |
| **Anonimização de dados antigos** | Rotina que anonimiza registros após o fim do prazo de retenção legal | 3 dias |
| **Política de retenção configurável** | Parametrização por tipo de dado, com expurgo automatizado | 3 dias |
| **Classificação de dados na interface** | Marcação visual dos campos confidenciais e mascaramento por perfil | 2 dias |

---

### 2.5 Possui normas, procedimentos e práticas para concessão e revogação dos usuários?

**Resposta:** ✅ **Sim, os controles técnicos estão implementados.** 🔧 A **normatização formal** (documento de política) ainda precisa ser escrita.

#### ✅ Controles técnicos já implementados

**Concessão:**

- Criação de usuário **restrita ao perfil `ADMIN`** (verificação no servidor);
- Validação estrita dos dados de entrada (nome, e-mail, perfil) via esquema `zod`;
- Bloqueio de e-mail duplicado (retorno HTTP 409);
- Atribuição obrigatória de perfil no momento da criação, com padrão restritivo (`ANALYST`);
- Senha submetida a **política de complexidade**: mínimo de 10 caracteres, combinação de ao menos 3 entre maiúscula, minúscula, número e símbolo, e bloqueio de senhas previsíveis (dicionário de senhas comuns, incluindo variações de "funcional");
- Registro do evento na trilha de auditoria, com autor e IP.

**Revogação:**

- **Desativação lógica** (`active = false`), preservando o histórico de auditoria — não há exclusão física que quebre a rastreabilidade;
- **Efeito imediato:** o usuário desativado é recusado no login na verificação de credenciais;
- **Proteção contra bloqueio administrativo total:** o sistema impede a desativação ou o rebaixamento do último `ADMIN` ativo, evitando a perda de governança sobre a plataforma;
- Registro do evento na trilha de auditoria.

**Alteração de privilégio:** mudança de perfil restrita ao `ADMIN`, com registro auditado do perfil anterior e do novo.

**Higiene de credenciais:** troca de senha pelo próprio usuário exige a senha atual, submete a nova à política de complexidade e gera evento auditado.

#### 🔧 O que podemos implantar

| Lacuna | Solução | Esforço |
|---|---|---|
| **Não há política formal escrita** | Documento de Política de Gestão de Identidades e Acessos (concessão, revisão, revogação, matriz de segregação de funções) | 3 dias |
| **Revogação não é automática no desligamento** | Integração com AD/Azure AD — ver item 3.1; desativa a conta automaticamente quando o usuário é desligado no diretório corporativo | ver item 3.1 |
| **Não há expiração de senha** | Expiração configurável (ex.: 90 dias) com aviso prévio | 2 dias |
| **Não há histórico de senhas** | Bloqueio de reutilização das últimas N senhas | 1 dia |
| **Não há bloqueio por inatividade** | Desativação automática de contas sem acesso por X dias | 1 dia |
| **Não há MFA** | Autenticação multifator (TOTP), obrigatória por perfil | 5 a 8 dias |
| **Não há recuperação de senha** | Fluxo de redefinição por e-mail com token de uso único e expiração curta | 3 dias |
| **Não há recertificação de acesso** | Relatório periódico de usuários e perfis para revalidação pelos gestores | 2 dias |

---

## 3. Integrações

### 3.1 Possui integração com o gerenciador de contas da Funcional — Active Directory (AD) / Azure AD?

**Resposta:** 🔧 **Não implementado hoje.** A autenticação é local (e-mail e senha, com hash bcrypt e rate limiting). **A integração é plenamente viável e é a nossa principal recomendação de evolução em segurança.**

#### ✅ O que já temos

A base de autenticação usa **NextAuth v5 (Auth.js)**, biblioteca que suporta nativamente os provedores corporativos. A arquitetura foi construída com o provedor de credenciais **isolado em um módulo dedicado**, o que significa que adicionar um provedor de diretório **não exige reescrita da aplicação** — o modelo de sessão, o middleware de proteção de rotas e o controle de perfis permanecem inalterados.

#### 🔧 O que podemos implantar

| Opção | Descrição | Esforço |
|---|---|---|
| **Azure AD / Microsoft Entra ID (SSO — recomendado)** | Login com a conta corporativa via OAuth 2.0 / OpenID Connect. Elimina senha local, herda as políticas de senha e MFA do diretório e revoga o acesso automaticamente no desligamento | **5 a 8 dias** |
| **LDAP / Active Directory on-premises** | Autenticação direta contra o AD interno, para cenário sem Azure | 5 a 8 dias |
| **Mapeamento automático de grupos → perfis** | Grupos do AD (ex.: `GRP-Faturamento-Analista`) mapeados para os perfis da aplicação, eliminando a atribuição manual de privilégios | 3 dias |
| **Provisionamento automático (SCIM)** | Criação, atualização e desativação de contas sincronizadas com o diretório | 8 a 10 dias |
| **Modo híbrido** | SSO como padrão e credencial local como contingência para uso emergencial | +2 dias |

**Benefícios diretos da integração:**

- Elimina a base de senhas local (e o risco associado a ela);
- Herda MFA e política de senha já vigentes na Funcional Farma, sem redesenvolvê-las;
- **Revogação imediata no desligamento** — resolve a principal lacuna apontada no item 2.5;
- Reduz chamados de reset de senha no Service Desk;
- Experiência de login unificada para o usuário.

**Recomendação:** implantar SSO com Entra ID em modo híbrido (5 a 8 dias + 2 dias). É a melhoria com maior relação benefício/esforço de todo este documento.

---

### 3.2 Possuirá integração com outros sistemas da Funcional ou terceiros?

**Resposta:** ✅ **Sim, hoje via troca de arquivos** (padrão de integração assíncrona por planilha).

#### ✅ Integrações já em operação

| Sistema | Direção | Mecanismo |
|---|---|---|
| **Autorizador (Johnson & Johnson)** | Entrada | Upload manual da planilha de autorizações (`.xlsx` / `.xls` / `.csv`) |
| **Proteus (ERP Funcional)** | Entrada | Upload manual da planilha de ordens de pagamento |
| **Proteus (ERP Funcional)** | Saída | Exportação da planilha no layout Proteus |
| **Processo interno de faturamento** | Saída | Exportação no layout Funcional, segmentada em Grandes Redes e Convencionais |

**Não há hoje** integração via API, chamada a serviços externos ou envio de dados para fora do perímetro. A política de segurança da aplicação (`connect-src 'self'`) **bloqueia tecnicamente** qualquer conexão de saída não prevista — o que é, em si, um controle de segurança relevante.

#### 🔧 O que podemos implantar

| Integração | Descrição | Esforço |
|---|---|---|
| **API REST do Proteus** | Substituir o upload manual por consumo direto da API, eliminando a etapa manual e o risco de arquivo desatualizado | 8 a 15 dias (depende da API disponível) |
| **API do Autorizador (J&J)** | Ingestão automática das autorizações, sujeita à disponibilização pela J&J | 8 a 15 dias |
| **Ingestão automática por diretório monitorado** | Leitura automática de arquivos depositados em pasta de rede ou storage, sem upload manual | 3 a 5 dias |
| **Notificação por e-mail / Teams** | Aviso automático de fechamento concluído, divergências abertas e falhas de processamento | 3 dias |
| **Exportação para BI** | Endpoint ou *view* para Power BI / Tableau consumirem os dados conciliados | 3 a 5 dias |
| **API pública documentada** | REST com autenticação por token e documentação OpenAPI, para integração com sistemas futuros | 8 a 10 dias |
| **Webhooks** | Notificação a sistemas terceiros na conclusão de um faturamento | 3 dias |

---

## 4. Disponibilidade, backup e localização

### 4.1 Possui disponibilidade de solução de no mínimo 99,5%?

**Resposta:** 🟡 **Tecnicamente alcançável — depende da topologia de infraestrutura contratada.** A meta de 99,5% permite até **3h39min de indisponibilidade por mês**, o que é compatível inclusive com topologias simples.

#### ✅ O que a aplicação já entrega em favor da disponibilidade

- **Empacotamento em container Docker** com saída *standalone*, o que torna o restabelecimento do serviço uma operação de segundos e o deploy reproduzível;
- **Aplicação sem estado (*stateless*)**: a sessão é baseada em JWT, sem dependência de estado em memória do servidor — isso permite escalar horizontalmente e substituir instâncias sem afetar usuários logados;
- **Migrações de banco automatizadas na subida do container**, eliminando erro humano no deploy;
- **Processamento assíncrono do pipeline**: a conciliação roda em segundo plano, sem bloquear a interface nem derrubar a requisição em caso de arquivo grande;
- **Degradação controlada do rate limiting**: se o banco ficar indisponível, o controle de limite falha em modo permissivo, evitando que uma falha de componente secundário derrube o login de todos os usuários;
- **Tratamento de erro no pipeline**: falha de processamento marca o upload com erro e registra o motivo, sem derrubar a aplicação.

#### 🟡 Cenários de infraestrutura e disponibilidade esperada

| Topologia | Disponibilidade estimada | Atende 99,5%? |
|---|---|---|
| Container único em VM, sem redundância | ~99,0% – 99,3% | ⚠️ Marginal |
| Container único + banco gerenciado + monitoramento e restart automático | ~99,5% – 99,7% | ✅ Sim |
| 2+ réplicas atrás de balanceador + banco gerenciado com réplica | ~99,9% | ✅ Com folga |
| Kubernetes com múltiplas zonas | ~99,95%+ | ✅ Com folga |

#### 🔧 O que podemos implantar

| Item | Descrição | Esforço |
|---|---|---|
| **Endpoint de *health check*** | `/api/health` verificando aplicação e conectividade com o banco, para uso do balanceador e do monitoramento | 1 dia |
| **Monitoramento e alertas** | Uptime, tempo de resposta, taxa de erro, uso de recursos, com alerta por e-mail/Teams | 3 a 5 dias |
| **Alta disponibilidade** | Múltiplas réplicas atrás de balanceador de carga | 3 a 5 dias |
| **Restart automático** | Política de reinício e *liveness probe* no orquestrador | 1 dia |
| **Painel de status** | Página de status para os usuários finais | 2 dias |
| **Plano de continuidade (DRP)** | Procedimento documentado de recuperação de desastre, com RTO e RPO definidos e testados | 5 dias |
| **Acordo de nível de serviço** | SLA formal com janela de manutenção programada e métricas de apuração | Definição contratual |

**Recomendação para atingir 99,5% com esforço mínimo:** *health check* (1 dia) + monitoramento com alerta (3 dias) + restart automático (1 dia) + banco gerenciado. **Total: 5 dias de trabalho.**

---

### 4.2 Qual a garantia de backups?

**Resposta:** 🟡 **Não há rotina de backup implementada na aplicação — é responsabilidade da camada de infraestrutura.** Este é o **segundo ponto de atenção** do documento, e o mais crítico do ponto de vista de continuidade do negócio.

#### ✅ O que já favorece a recuperação

- **Todo o estado relevante está no PostgreSQL** — não há dado de negócio em sistema de arquivos, cache ou memória. Isso significa que **um backup do banco é suficiente para restaurar 100% da operação**, o que simplifica muito a estratégia de backup;
- **Arquivos de origem não são estado crítico**: as planilhas do Autorizador e do Proteus são reproduzíveis a partir dos sistemas de origem, e o sistema suporta **reprocessamento de um faturamento** sem duplicar registros (existe deduplicação por voucher + articulação e um botão de "limpar e reprocessar");
- **Esquema de banco versionado** em migrações Git — a estrutura pode ser recriada do zero de forma determinística;
- **Imagem de aplicação reproduzível** via Dockerfile.

#### 🟡 A definir na infraestrutura

| Item | Recomendação |
|---|---|
| **Frequência** | Backup completo diário + WAL contínuo (permite recuperação a qualquer ponto no tempo) |
| **RPO (perda máxima aceitável)** | ≤ 15 minutos com WAL; ≤ 24 horas apenas com o completo diário |
| **RTO (tempo máximo de restauração)** | ≤ 4 horas |
| **Retenção** | 30 dias diários, 12 meses mensais, 5 anos anuais (alinhado ao prazo fiscal) |
| **Localização** | Cópia off-site, em região distinta da produção |
| **Criptografia** | Backup cifrado em repouso e em trânsito |
| **Teste de restauração** | Exercício trimestral documentado — *backup não testado não é backup* |

Em banco gerenciado (RDS / Cloud SQL / Azure Database), backup automatizado, retenção configurável, criptografia e recuperação a ponto no tempo já vêm nativamente, atendendo integralmente ao requisito **sem desenvolvimento**.

#### 🔧 O que podemos implantar

| Item | Descrição | Esforço |
|---|---|---|
| **Rotina de backup automatizada** | `pg_dump` agendado, com compressão, criptografia e envio para storage externo | 2 a 3 dias |
| **Recuperação a ponto no tempo (PITR)** | Arquivamento contínuo de WAL | 3 dias |
| **Monitoramento de backup** | Alerta em caso de falha ou de backup não executado na janela | 1 dia |
| **Procedimento de restauração documentado** | Runbook com passo a passo testado | 2 dias |
| **Teste automatizado de restauração** | Restauração periódica em ambiente isolado, com validação de integridade | 3 a 5 dias |
| **Exportação de segurança** | Extração periódica dos faturamentos consolidados em formato aberto, como salvaguarda adicional | 2 dias |

**Recomendação:** adotar banco gerenciado com backup nativo (esforço zero) **ou**, em VM própria, implantar rotina automatizada + monitoramento + runbook (**5 a 6 dias**). Em qualquer cenário, o teste trimestral de restauração é obrigatório.

---

### 4.3 Localização geográfica apenas em países que possuem lei de proteção de dados ou leis igualitárias?

**Resposta:** 🟡 **A definir no provisionamento — nossa recomendação é hospedagem integralmente no Brasil.**

#### ✅ O que já temos a favor

- **Nenhuma dependência de serviço externo em tempo de execução.** A política de segurança da aplicação restringe conexões de saída à própria origem, o que significa que **não há transferência internacional de dados por dependência técnica** — nenhum dado sai do perímetro para APIs, telemetria ou serviços de terceiros;
- **Telemetria do framework desabilitada** explicitamente na imagem de produção (`NEXT_TELEMETRY_DISABLED=1`);
- **A aplicação é agnóstica de provedor:** por ser um container Docker padrão com banco PostgreSQL, pode ser hospedada em qualquer provedor ou em datacenter próprio, sem alteração de código. Não há aprisionamento tecnológico que force uma região específica.

#### 🟡 Recomendação de localização

| Prioridade | Opção | Enquadramento legal |
|---|---|---|
| **1ª (recomendada)** | Brasil (São Paulo — AWS `sa-east-1`, Azure Brazil South, GCP `southamerica-east1`, ou datacenter nacional) | LGPD — sem transferência internacional, elimina o tema |
| **2ª** | União Europeia | GDPR — reconhecido como grau de proteção adequado |
| **3ª** | EUA com cláusulas contratuais padrão | Exige salvaguardas do art. 33 da LGPD |
| **Descartado** | Países sem legislação de proteção de dados | Não recomendado |

Hospedar no Brasil elimina integralmente a discussão de transferência internacional (arts. 33 a 36 da LGPD), reduz latência para os usuários e simplifica a resposta a requisições da ANPD.

#### 🔧 O que podemos implantar

| Item | Descrição | Esforço |
|---|---|---|
| **Declaração formal de localização** | Documento atestando a região de hospedagem de aplicação, banco e backups | 0,5 dia |
| **Restrição técnica de região** | Configuração que impeça provisionamento fora da região aprovada | 1 dia |
| **Auditoria de fluxo de dados** | Mapeamento comprovado de que nenhum dado trafega para fora do perímetro | 2 dias |

---

## 5. Infraestrutura e arquitetura

### 5.1 Requer instalação em VM, servidor, cloud?

**Resposta:** ✅ **Container Docker — roda em qualquer um dos três.** A aplicação já está empacotada e pronta para deploy.

#### ✅ O que já temos

- **Dockerfile multi-estágio** (dependências → build → runtime), com imagem final enxuta baseada em Alpine Linux;
- **Saída *standalone* do Next.js** — a imagem de produção contém apenas o necessário para executar, sem ferramentas de build;
- **Execução com usuário não privilegiado** (UID 1001), boa prática de segurança de container;
- **Migrações de banco executadas automaticamente** na inicialização, via *entrypoint*;
- **Configuração por variáveis de ambiente** — nenhum segredo embutido na imagem;
- **Build otimizado para servidores modestos** (ajuste de heap do Node para evitar estouro de memória em VPS pequenas).

#### Requisitos mínimos

| Recurso | Mínimo | Recomendado |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| Memória | 2 GB (4 GB para o build) | 8 GB |
| Disco | 20 GB | 50 GB + crescimento do banco |
| Banco | PostgreSQL 14+ | PostgreSQL 16, gerenciado |
| Rede | Porta 3000 (interna), 443 via proxy | — |

#### Opções de implantação

| Modelo | Observação |
|---|---|
| **VM on-premises** | Docker + PostgreSQL na própria infraestrutura da Funcional Farma |
| **VM em nuvem (IaaS)** | EC2 / Azure VM / Compute Engine, com banco gerenciado |
| **Container gerenciado (recomendado)** | ECS, Azure Container Apps, Cloud Run — menor esforço operacional |
| **Kubernetes** | Para cenário de alta disponibilidade multizona |

#### 🔧 O que podemos implantar

| Item | Descrição | Esforço |
|---|---|---|
| **Docker Compose de referência** | Stack completa (aplicação + PostgreSQL + proxy com TLS) para subida em um comando | 1 dia |
| **Infraestrutura como código** | Terraform ou Bicep para provisionamento reproduzível e auditável | 5 a 8 dias |
| **Pipeline de CI/CD** | Build, testes, análise de vulnerabilidades e deploy automatizados | 3 a 5 dias |
| **Manifestos Kubernetes / Helm** | Para o cenário de HA | 3 a 5 dias |
| **Varredura de vulnerabilidades da imagem** | Trivy ou equivalente no pipeline, com bloqueio por severidade | 1 dia |

---

### 5.2 Qual a arquitetura da solução do projeto para a Funcional?

**Resposta:** ✅ **Monólito modular em container, com banco relacional único.** Arquitetura deliberadamente simples, adequada ao volume e ao número de usuários, e de baixo custo de sustentação.

#### Diagrama lógico

```
┌──────────────────────────────────────────────────────────────────┐
│                        USUÁRIOS (navegador)                      │
│              Faturamento · Financeiro · Comercial · TI           │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS / TLS 1.2+
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│              PROXY REVERSO (terminação TLS · HSTS)               │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP interno (porta 3000)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│         CONTAINER DA APLICAÇÃO — Next.js 15 (standalone)         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ MIDDLEWARE — bloqueia toda rota não pública sem sessão     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │ INTERFACE (SSR/RSC)  │  │ API (rotas server-side)          │  │
│  │ · Dashboard          │  │ · /api/faturamento               │  │
│  │ · Faturamento        │  │ · /api/faturamento/[id]/export   │  │
│  │ · Divergências       │  │ · /api/usuarios                  │  │
│  │ · Análises           │  │ · /api/perfil                    │  │
│  │ · Configurações      │  │ · /api/auth (NextAuth v5)        │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ CAMADA DE DOMÍNIO                                          │  │
│  │  authz (RBAC) · audit (trilha) · rateLimit · password      │  │
│  │  pipeline: limpar → deduplicar → persistir → conciliar     │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ PRISMA ORM 6 — acesso tipado + migrações versionadas       │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ TCP (recomendado: TLS)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 14+                              │
│  User · Clinica · Medicamento · Faturamento · UploadArquivo      │
│  Pedido · OrdemPagamento · Conciliacao · Divergencia             │
│  AuditLog · RateLimitHit                                         │
└──────────────────────────────────────────────────────────────────┘
```

#### Fluxo funcional do faturamento

```
1. UPLOAD        Usuário (ANALYST+) envia planilhas do Autorizador e do Proteus
                 → validação de extensão, tamanho (≤50MB) e período
                 → bloqueio de período duplicado
                 → evento auditado

2. LIMPEZA       Normalização por origem (limparAutorizador / limparProteus)

3. DEDUPLICAÇÃO  Vouchers já faturados em períodos anteriores são retirados
                 (equivalente automatizado do PROCV histórico manual)

4. PERSISTÊNCIA  Gravação idempotente por voucher + articulação
                 (permite reprocessar sem duplicar)

5. CONCILIAÇÃO   Match primário por nota fiscal normalizada
                 Fallback por código de ordem de pagamento
                 Comparação de valores com tolerância de R$ 0,01
                 Verificação de CNPJ e razão social

6. DIVERGÊNCIAS  Classificação automática em 8 tipos
                 → tratativa com registro de autor, data e notas

7. EXPORTAÇÃO    Planilhas nos layouts Funcional e Proteus
                 Segmentação Grandes Redes × Convencionais
                 → evento auditado
```

#### Decisões de arquitetura e sua justificativa

| Decisão | Justificativa |
|---|---|
| **Monólito, não microsserviços** | Volume e equipe não justificam a complexidade operacional de sistema distribuído; reduz custo de sustentação e pontos de falha |
| **Aplicação sem estado** | Permite escalar horizontalmente e substituir instâncias sem afetar sessões ativas |
| **Autorização no servidor, por endpoint** | Não há confiança em validação de interface — o front-end é tratado como não confiável |
| **Processamento em memória** | Planilhas não persistem em disco de forma duradoura, reduzindo a superfície de exposição de dados |
| **Pipeline idempotente** | Reprocessamento seguro, sem duplicação — resiliência operacional |
| **Migrações versionadas** | Evolução de esquema auditável e reprodutível |
| **Pseudonimização no esquema** | Conformidade com a LGPD imposta pela estrutura do banco, não por disciplina de operação |

#### 🔧 Evoluções arquiteturais possíveis

| Item | Descrição | Esforço |
|---|---|---|
| **Fila de processamento** | Mover o pipeline para fila dedicada (BullMQ/Redis), com retentativa e visibilidade de progresso | 5 a 8 dias |
| **Cache de leitura** | Redis para acelerar análises e relatórios sobre grandes volumes | 3 dias |
| **Separação leitura/escrita** | Réplica de leitura para relatórios pesados | 3 dias |
| **Observabilidade** | Rastreamento distribuído e métricas (OpenTelemetry) | 5 dias |
| **Armazenamento de objetos** | Uploads em S3/Blob com ciclo de vida e criptografia, no lugar de `/tmp` | 3 dias |

---

## 6. Aspectos jurídicos e documentais

### 6.1 Possui NDA com a Funcional?

**Resposta:** ⚪ / 🟡 **A pergunta pressupõe fornecedor externo.** Como o sistema é proprietário da Funcional Farma, não há terceiro detentor de código ou de dados a ser vinculado por NDA nesta relação.

**O que se aplica, e recomendamos formalizar:**

| Instrumento | Aplicabilidade |
|---|---|
| **Acordo de confidencialidade com a equipe de desenvolvimento** | ✅ Recomendado — cobre o acesso a dados de produção durante o suporte |
| **Cláusula de confidencialidade em contrato de prestação de serviço** | ✅ Recomendado |
| **Termo de responsabilidade de acesso a dados** | ✅ Recomendado para qualquer pessoa com acesso à base de produção |
| **Contrato de operador de dados (art. 39 LGPD)** | ✅ Recomendado se a sustentação for terceirizada |
| **Declaração de propriedade intelectual do código** | ✅ Recomendado — formaliza a titularidade da Funcional Farma sobre o código-fonte |

🔧 **Podemos implantar:** minuta técnica dos termos de confidencialidade e do contrato de operador, para revisão do jurídico da Funcional Farma. **Esforço: 2 dias.**

---

### 6.2 Se faz necessário antes a realização de uma POC (Prova de Conceito)?

**Resposta:** ✅ **Não é necessária — a POC já foi superada.** O sistema está em estágio de **MVP funcional e operante**, com todo o fluxo implementado de ponta a ponta.

**Evidências de maturidade já disponíveis para demonstração:**

- Ciclo completo funcionando: upload → limpeza → deduplicação → conciliação → divergências → exportação;
- Regras de conciliação implementadas conforme o processo real documentado pela área de faturamento;
- Autenticação, RBAC com quatro perfis e trilha de auditoria operantes;
- Interface completa: dashboard, gestão de faturamentos, tratativa de divergências, análises por ano/clínica/medicamento, configurações;
- Empacotamento em container pronto para produção.

**O que recomendamos no lugar de uma POC:**

| Atividade | Descrição | Esforço |
|---|---|---|
| **Piloto assistido** | 1 a 2 ciclos reais de faturamento executados em paralelo ao processo atual em Excel, com conferência dos resultados | 2 a 4 semanas de operação |
| **Validação de acurácia** | Comparação formal entre a conciliação automática e a manual, com relatório de divergências de resultado | 3 dias |
| **Teste de carga** | Validação com o maior volume histórico de planilha | 2 dias |
| **Homologação pela área de negócio** | Termo de aceite funcional assinado pelo gestor de faturamento | 1 semana |

O piloto assistido é mais valioso que uma POC: valida a **acurácia das regras de negócio** com dados reais, que é o risco relevante do projeto — e não a viabilidade técnica, já demonstrada.

---

### 6.3 Por favor compartilhar a política de privacidade (anexar)

**Resposta:** ✅ **Já existe e está publicada na própria aplicação, em rota de acesso público** (não exige login): **`/privacidade`**.

**Conteúdo já coberto pela política vigente:**

| Seção | Conteúdo |
|---|---|
| 1. Controlador | Funcional Farma, nos termos da LGPD (Lei 13.709/2018) |
| 2. Dados tratados | Declaração explícita de que **não** são armazenados nome, CPF, endereço ou dado diretamente identificável de paciente |
| 3. Bases legais | Execução de contrato (art. 7º, V), obrigação legal (art. 7º, II), legítimo interesse (art. 7º, IX) |
| 4. Compartilhamento | Apenas com a Johnson & Johnson, restrito às planilhas de faturamento |
| 5. Segurança | Autenticação, RBAC, trilha de auditoria, TLS, backups |
| 6. Retenção | Pelo prazo das obrigações legais e contratuais |
| 7. Direitos do titular | Art. 18 da LGPD — confirmação, acesso, correção, anonimização, portabilidade, eliminação |
| 8. Incidentes | Comunicação à ANPD e aos titulares, conforme art. 48 |
| 9. Contato | Canal do encarregado (DPO) |

Existem também **Termos de Uso** publicados em **`/termos`**, igualmente de acesso público.

🔧 **O que podemos implantar / complementar:**

| Item | Descrição | Esforço |
|---|---|---|
| **Versão em PDF assinada** | Documento formal para anexo ao processo de avaliação do cliente | 0,5 dia |
| **Revisão pelo jurídico e DPO** | Validação e complemento dos prazos concretos de retenção e do contato nominal do encarregado | Depende do jurídico |
| **Controle de versão da política** | Histórico de versões com data de vigência e registro de aceite pelos usuários | 2 dias |
| **Aceite registrado no primeiro acesso** | Tela de aceite dos termos, com registro auditado de data, hora e IP | 2 dias |

---

### 6.4 Por favor compartilhar o relatório de pentest da empresa ou serviço oferecido (anexar)

**Resposta:** 🔧 **Não há relatório de pentest — nenhum teste de intrusão formal foi realizado até o momento.** Registramos isso de forma direta, sem atenuação, por ser um requisito objetivo do questionário.

#### ✅ Controles de segurança já implementados (defesa em profundidade)

Ainda que sem validação externa, o sistema foi desenvolvido com controles alinhados ao OWASP Top 10:

| Risco OWASP | Controle implementado |
|---|---|
| **A01 — Quebra de controle de acesso** | RBAC verificado no servidor em todo endpoint; middleware global de autenticação; proteção contra remoção do último administrador |
| **A02 — Falhas criptográficas** | bcrypt custo 12 para senhas; TLS obrigatório com HSTS; cookies `Secure` + `HttpOnly` |
| **A03 — Injeção** | Prisma ORM com consultas parametrizadas; nas consultas SQL diretas do controle de limite, os valores são passados como parâmetros vinculados, não concatenados; validação de entrada com `zod` |
| **A04 — Desenho inseguro** | Pseudonimização estrutural no esquema do banco; pipeline idempotente |
| **A05 — Configuração incorreta** | Cabeçalho `X-Powered-By` removido; CSP restritiva; container sem root; telemetria desabilitada |
| **A07 — Falhas de identificação** | Rate limiting por IP e por e-mail; política de complexidade de senha; sessão com expiração de 8h |
| **A08 — Integridade de software e dados** | Dependências fixadas via `package-lock.json`; build reproduzível; instalação sem execução de scripts de terceiros (`--ignore-scripts`) |
| **A09 — Falhas de registro e monitoramento** | Trilha de auditoria implementada (com a lacuna de login/logout já apontada) |
| **A10 — SSRF** | `connect-src 'self'` na CSP; nenhuma requisição de saída baseada em entrada do usuário |

**Controles adicionais:** validação de extensão e de tamanho de arquivo no upload; nomes de arquivo gerados internamente com UUID (impede *path traversal*); planilhas excluídas do versionamento por `.gitignore`.

#### 🔧 O que podemos implantar

| Item | Descrição | Esforço / prazo |
|---|---|---|
| **Pentest externo (recomendado)** | Teste de intrusão *black box* e *grey box* por empresa especializada, com relatório formal e reteste após correções | 2 a 3 semanas (contratação de terceiro) |
| **Análise estática (SAST)** | Ferramenta de análise de código no pipeline de CI | 2 dias |
| **Análise de dependências (SCA)** | `npm audit` / Snyk / Dependabot, com alerta e bloqueio por severidade | 1 dia |
| **Varredura de imagem** | Trivy sobre a imagem Docker no pipeline | 1 dia |
| **Análise dinâmica (DAST)** | OWASP ZAP em ambiente de homologação | 3 dias |
| **Autoavaliação documentada** | Checklist OWASP ASVS nível 2, preenchido e evidenciado — entrega valor imediato enquanto o pentest é contratado | 3 a 5 dias |
| **Correção de achados** | Reservado para as correções decorrentes do pentest | A dimensionar |

**Recomendação:** contratar o pentest externo **antes da entrada em produção com dados reais**, e implantar imediatamente SCA + varredura de imagem no pipeline (2 dias), que já elevam a postura de segurança de forma contínua e automática.

---

## 7. Questionário de Inteligência Artificial

### ⚪ NÃO APLICÁVEL — o sistema não utiliza nenhuma tecnologia de IA

**Declaração formal:** a Plataforma de Faturamento e Conciliação da Funcional Farma **não emprega inteligência artificial em nenhuma forma** — nem IA generativa, nem aprendizado de máquina, nem sistemas baseados em regras de inferência com aprendizado.

**Verificação realizada no código-fonte:** foi executada varredura em todo o repositório, incluindo o manifesto de dependências, buscando qualquer biblioteca, cliente de API ou integração de IA (OpenAI, Anthropic, Google Generative AI, Hugging Face, LangChain, TensorFlow, ONNX Runtime, entre outros). **Nenhuma ocorrência foi encontrada.** A lista completa de dependências de produção do projeto contém exclusivamente bibliotecas de interface, gráficos, calendário, leitura de planilhas, autenticação, ORM e validação.

**Toda a lógica do sistema é determinística.** As regras de conciliação são condicionais explícitas, escritas e auditáveis linha a linha por qualquer pessoa com acesso ao código:

- Correspondência primária por nota fiscal normalizada; se ausente, correspondência por código de ordem de pagamento;
- Comparação de valores com tolerância fixa de R$ 0,01;
- Comparação literal de CNPJ e de razão social;
- Deduplicação por chave voucher + articulação.

**Consequência prática, e relevante para a avaliação de risco:** dadas as mesmas planilhas de entrada, o sistema produz **sempre exatamente o mesmo resultado**. Não há probabilidade, não há inferência estatística, não há treinamento, não há variação entre execuções, e não há possibilidade de "alucinação" ou de decisão não explicável. **Todo o risco associado a IA — viés algorítmico, injeção de prompt, envenenamento de dados, inversão de modelo, vazamento de contexto, decisão automatizada incorreta e não auditável — é estruturalmente inexistente neste sistema.**

### 7.1 Questionário de IA preenchido

Preenchido integralmente para fins de registro formal no processo de avaliação:

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Que tipo de IA o software utiliza? | **Nenhuma.** O sistema é 100% determinístico, baseado em regras de negócio codificadas explicitamente. Não é IA generativa, não é ML tradicional e não é IA baseada em regras com inferência — é lógica condicional convencional |
| 2 | A empresa fornece documentação técnica sobre o funcionamento da IA? | **Não aplicável.** Não há IA. A lógica de conciliação está documentada neste documento (seção 5.2) e integralmente legível no código-fonte, de propriedade da Funcional Farma |
| 3 | É possível explicar, de forma auditável, como a IA toma decisões? | **Não aplicável** — porém, respondendo ao espírito da pergunta: **sim, integralmente.** Cada divergência apontada é rastreável até a regra determinística que a gerou, com os valores comparados registrados (valor Autorizador, valor Proteus, diferença). A explicabilidade é total e por construção |
| 4 | Existe comitê ou política interna de governança de IA? | **Não aplicável.** Recomendamos que a Funcional Farma estabeleça política de governança de IA como diretriz corporativa, independentemente deste sistema |
| 5 | A IA processa dados pessoais ou sensíveis (LGPD)? | **Não aplicável** — não há IA. Sobre o sistema: trata dados pessoais de usuários e dados pseudonimizados de pacientes (ver 2.4). Nenhum dado é submetido a processamento por IA |
| 6 | Quais tipos de dados são coletados e processados pela IA? | **Nenhum.** Nenhum dado é processado por IA |
| 7 | Os dados são criptografados? | **Em trânsito: sim** (TLS 1.2+ com HSTS). **Em repouso: depende da infraestrutura** — ver seção 2.3, com recomendações e plano |
| 8 | Os dados dos clientes são usados para treinar modelo de IA? | **Nunca.** Não existe modelo, não existe treinamento. **Nenhum dado da Funcional Farma sai do perímetro da aplicação** — a política de segurança do navegador (`connect-src 'self'`) bloqueia tecnicamente qualquer envio a serviços externos |
| 9 | É possível excluir definitivamente os dados mediante solicitação? | **Sim.** Faturamentos podem ser excluídos pela interface (com registro em auditoria) e a exclusão física no banco é sempre possível. Usuários são desativados logicamente para preservar a trilha de auditoria, mas a exclusão definitiva é executável quando requerida por titular |
| 10 | O fornecedor possui certificações de segurança (ISO 27001, SOC 2)? | **Não aplicável** — não há fornecedor terceiro. As certificações aplicáveis seriam as da própria Funcional Farma e as do provedor de nuvem a ser contratado (AWS, Azure e GCP possuem ISO 27001 e SOC 2 Tipo II) |
| 11 | O software passa por testes de segurança periódicos? | **Não realiza hoje.** Ver seção 6.4 — pentest recomendado antes da produção com dados reais, e SAST/SCA/varredura de imagem propostos para o pipeline |
| 12 | Existe segregação entre ambiente de produção, teste e treinamento de IA? | **Ambiente de treinamento de IA: não aplicável.** **Produção × teste: 🔧 a implantar** — hoje não há ambiente de homologação segregado formalmente. Recomendamos criá-lo (ver seção 8) |
| 13 | A IA possui proteção contra prompt injection, data poisoning, model inversion, vazamento de contexto, uso indevido, preconceito racial ou religioso? | **Não aplicável — e esta é uma resposta forte, não uma evasiva.** Todos esses riscos são específicos de sistemas de IA. Um sistema determinístico não possui prompt a ser injetado, não possui modelo a ser envenenado ou invertido, não possui contexto a vazar e não possui viés estatístico. O risco é **estruturalmente ausente**, não apenas mitigado |
| 14 | Existem controles para evitar uso malicioso da IA? | **Não aplicável.** Sobre o sistema: existe RBAC, rate limiting, trilha de auditoria e validação de entrada |
| 15 | O sistema registra logs detalhados das interações da IA? | **Não aplicável.** O sistema registra as operações de negócio em trilha de auditoria (ver 2.1) |
| 16 | Possui integração dos logs a um SIEM corporativo? | **Não hoje.** 🔧 Viável — ver seção 8 (estimativa: 3 a 5 dias) |
| 17 | Existe DPIA / RIPD? | **Não hoje.** 🔧 Podemos elaborar em 5 dias, com apoio do DPO da Funcional Farma |
| 18 | O fornecedor se responsabiliza legalmente por vazamento, uso indevido da IA e decisões automatizadas incorretas? | **Não aplicável quanto a IA.** Sobre responsabilidade geral: como o sistema é proprietário da Funcional Farma, a responsabilidade de controlador é da própria empresa. A responsabilidade da equipe de desenvolvimento deve ser definida em contrato de prestação de serviço |
| 19 | É possível desativar funcionalidades de IA e restringir por usuário ou grupo? | **Desativar IA: não aplicável** (não há o que desativar). **Restringir por usuário ou grupo: ✅ sim** — RBAC com quatro perfis já implementado |
| 20 | Existe plano de resposta a incidentes envolvendo IA? | **Não aplicável quanto a IA.** 🔧 Plano geral de resposta a incidentes de segurança: recomendado, 5 dias |
| 21 | O fornecedor notifica incidentes de segurança em até 24h / 48h / 72h? | **A definir contratualmente.** Recomendamos **24 horas** para notificação interna e observância do prazo da ANPD para comunicação externa. A política de privacidade já prevê a comunicação do art. 48 da LGPD |
| 22 | Há política formal de backup e recuperação dos dados processados pela IA? | **IA: não aplicável.** **Backup do sistema: 🟡 a formalizar** — ver seção 4.2, com plano detalhado |

### 7.2 Se houver adoção futura de IA

Caso a Funcional Farma decida, no futuro, incorporar IA a esta plataforma (por exemplo, sugestão automática de causa provável para divergências recorrentes, ou detecção de anomalia em valores), assumimos o compromisso de:

1. Submeter previamente novo questionário de IA, respondido item a item;
2. Elaborar RIPD específico para o tratamento por IA;
3. Manter a decisão final sempre sob responsabilidade humana (sem decisão automatizada com efeito jurídico, nos termos do art. 20 da LGPD);
4. Garantir que nenhum dado da Funcional Farma seja usado para treinamento de modelo de terceiro;
5. Registrar em trilha de auditoria toda sugestão gerada e a decisão humana correspondente;
6. Preservar a operação determinística atual como caminho padrão, com a IA em caráter estritamente auxiliar e desativável.

---

## 8. Plano de adequação recomendado

Consolidação de todas as lacunas identificadas, priorizadas por criticidade e relação benefício/esforço.

### Fase 1 — Crítico, antes da produção com dados reais

| # | Item | Seção | Esforço |
|---|---|---|---|
| 1 | Auditoria de login, falha de login e logout | 2.1 | 2 a 3 dias |
| 2 | Rotina de backup automatizada + monitoramento + runbook de restauração | 4.2 | 5 a 6 dias |
| 3 | Criptografia em repouso (via banco gerenciado) | 2.3 | 0 dias (configuração) |
| 4 | Expurgo automático de uploads temporários | 2.3 | 1 dia |
| 5 | *Health check* + monitoramento + restart automático | 4.1 | 5 dias |
| 6 | TLS na conexão com o banco | 2.2 | 0,5 dia |
| 7 | Análise de dependências (SCA) + varredura de imagem no pipeline | 6.4 | 2 dias |
| 8 | Ambiente de homologação segregado da produção | 7.1 | 3 dias |
| | **Subtotal** | | **~19 a 21 dias** |

### Fase 2 — Alta prioridade

| # | Item | Seção | Esforço |
|---|---|---|---|
| 9 | **SSO com Azure AD / Entra ID (modo híbrido)** — maior retorno do plano | 3.1 | 7 a 10 dias |
| 10 | Mapeamento de grupos do AD para perfis | 3.1 | 3 dias |
| 11 | Pentest externo por empresa especializada | 6.4 | 2 a 3 semanas (terceiro) |
| 12 | RIPD / DPIA formal | 2.4 | 5 dias |
| 13 | Política de Gestão de Identidades e Acessos (documento) | 2.5 | 3 dias |
| 14 | Fluxo de recuperação de senha | 2.5 | 3 dias |
| 15 | Plano de resposta a incidentes de segurança | 7.1 | 5 dias |
| 16 | Runbook operacional + manual do usuário final | 1.8 / 1.9 | 6 a 7 dias |
| | **Subtotal** | | **~32 a 36 dias + pentest** |

### Fase 3 — Melhoria contínua

| # | Item | Seção | Esforço |
|---|---|---|---|
| 17 | Integração de logs com SIEM corporativo | 7.1 | 3 a 5 dias |
| 18 | MFA (TOTP) — dispensável se o SSO for implantado | 2.5 | 5 a 8 dias |
| 19 | Alta disponibilidade com múltiplas réplicas | 4.1 | 3 a 5 dias |
| 20 | Retenção, exportação e arquivamento da trilha de auditoria | 2.1 | 3 dias |
| 21 | Fluxo de atendimento aos direitos do titular (art. 18) | 2.4 | 3 a 5 dias |
| 22 | Infraestrutura como código + CI/CD | 5.1 | 8 a 13 dias |
| 23 | Notificações automáticas (e-mail / Teams) | 3.2 | 3 dias |
| 24 | Integração via API com Proteus e Autorizador | 3.2 | 16 a 30 dias |
| 25 | Fila dedicada de processamento | 5.2 | 5 a 8 dias |
| | **Subtotal** | | **~49 a 80 dias** |

> As estimativas referem-se a dias úteis de trabalho técnico, considerando um desenvolvedor. Itens que dependem de terceiros (pentest, jurídico, contratação de infraestrutura) estão sinalizados e correm em paralelo.

---

## 9. Anexos e pendências documentais

| Documento | Situação | Como obter |
|---|---|---|
| **Política de Privacidade** | ✅ Disponível | Publicada em `/privacidade`; PDF assinado em 0,5 dia |
| **Termos de Uso** | ✅ Disponível | Publicados em `/termos`; PDF assinado em 0,5 dia |
| **Arquitetura da solução** | ✅ Disponível | Seção 5.2 deste documento |
| **Inventário de dados pessoais** | ✅ Disponível | Seção 2.4 deste documento |
| **Inventário de licenças (SBOM)** | 🔧 A gerar | 1 dia |
| **Relatório de pentest** | 🔧 A contratar | 2 a 3 semanas |
| **RIPD / DPIA** | 🔧 A elaborar | 5 dias |
| **Política de backup e recuperação** | 🔧 A formalizar | 2 dias após definição da infraestrutura |
| **Política de gestão de acessos** | 🔧 A elaborar | 3 dias |
| **Plano de resposta a incidentes** | 🔧 A elaborar | 5 dias |
| **Runbook operacional** | 🔧 A elaborar | 3 dias |
| **Manual do usuário final** | 🔧 A elaborar | 3 a 4 dias |
| **Acordo de confidencialidade / contrato de operador** | 🔧 A formalizar | 2 dias (minuta técnica) |
| **Termo de aceite funcional** | 🔧 Após piloto assistido | 1 semana |

---

## 10. Considerações finais

**Pontos fortes da solução, do ponto de vista de avaliação de risco:**

1. **Proteção à privacidade por construção.** O banco de dados **não possui campo** para nome, CPF ou endereço de paciente. Isso não é configuração — é restrição estrutural do esquema. É a mitigação mais forte possível para o risco de vazamento de dado de saúde.
2. **Ausência total de IA.** Todo o conjunto de riscos do questionário de IA é estruturalmente inexistente, não apenas mitigado. O sistema é determinístico e auditável linha a linha.
3. **Zero dependência de serviço externo em execução.** Nenhum dado sai do perímetro — e isso é imposto tecnicamente pela política de segurança da aplicação, não apenas prometido.
4. **Sem custo de licença e sem aprisionamento tecnológico.** Stack integralmente livre, código de propriedade da Funcional Farma, hospedável em qualquer provedor.
5. **Controles de segurança já implementados** em profundidade: RBAC verificado no servidor, trilha de auditoria, rate limiting, política de senha forte, cabeçalhos de segurança, container sem privilégio de root.

**Pontos de atenção assumidos, com plano de correção dimensionado:**

1. **Backup não implementado** — maior risco de continuidade do negócio. Resolvido em 5 a 6 dias, ou com esforço zero via banco gerenciado.
2. **Criptografia em repouso ausente na aplicação** — mitigada pela pseudonimização estrutural; resolvida com esforço zero via banco gerenciado.
3. **Login e logout não auditados** — lacuna real na trilha de auditoria. Resolvida em 2 a 3 dias.
4. **Sem integração com AD / Azure AD** — resolvida em 7 a 10 dias; é a melhoria de maior retorno do plano.
5. **Sem pentest** — recomendamos contratar antes da entrada em produção com dados reais.

**Recomendação:** executar integralmente a **Fase 1** (~20 dias) antes da entrada em produção com dados reais, e o **SSO com Entra ID** logo em seguida. Com isso, o sistema atende de forma consistente aos requisitos de segurança, disponibilidade, auditoria e conformidade com a LGPD apresentados neste questionário.

---

*Documento elaborado a partir da análise direta do código-fonte da plataforma. Todas as afirmações classificadas como "já temos" são verificáveis no repositório. As estimativas de esforço são técnicas e não incluem prazos de aprovação, contratação ou homologação.*
