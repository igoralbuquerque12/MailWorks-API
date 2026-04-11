# SPEC UNIVERSAL — MailWorks-API

## 1. Visão Geral do Projeto

**MailWorks-API** é uma API de mensageria de e-mails construída como infraestrutura SaaS (Software as a Service). O objetivo é ser um provedor agnóstico e escalável que terceiros utilizam para enviar e-mails transacionais (2FA, notificações de conta, confirmações) e em massa (marketing, newsletters).

O sistema não é uma aplicação de usuário final. É uma **plataforma de infraestrutura** — os clientes (Tenants) se conectam a ela via API Key para disparar envios através de suas próprias credenciais de provedor de e-mail.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | NestJS (TypeScript) |
| Banco de Dados | PostgreSQL + TypeORM |
| Cache / Filas | Redis (ioredis) |
| Mensageria | Bull (filas Redis-backed) |
| Envio SMTP | Nodemailer |
| Validação | class-validator + class-transformer |
| Containerização | Docker + Docker Compose |

---

## 3. Arquitetura Multi-Tenant

### Modelo de Isolamento
O sistema adota **Shared Database, Shared Schema** com coluna `tenant_id` como discriminador em todas as tabelas relevantes.

### Identificação do Tenant
Toda requisição autenticada deve carregar o header `X-Tenant-ID` com o UUID do tenant. A ausência desse header em rotas protegidas deve resultar em `400 Bad Request`.

No futuro, o `tenant_id` será extraído de um JWT, mas por ora o header direto é suficiente.

### Regras de Isolamento
- Nenhuma query pode ser executada sem o filtro `tenant_id`.
- Um tenant **nunca** pode visualizar ou manipular dados de outro tenant.
- As credenciais de provedor de e-mail (`TenantEmailProvider`) são exclusivas por tenant.

---

## 4. Design Patterns Obrigatórios

### 4.1 Strategy Pattern — Provedores de E-mail
Existe uma interface comum `IEmailProvider` que define o contrato de envio:

```typescript
interface IEmailProvider {
  send(payload: EmailPayload): Promise<void>;
}
```

Todo provider (SMTP, Mailgun, Resend, AWS SES) deve implementar essa interface. A camada de serviço nunca conhece a implementação concreta — ela sempre recebe um `IEmailProvider`.

A instanciação do provider correto é responsabilidade exclusiva do `EmailProviderFactory`, que recebe a configuração salva do tenant e retorna o adapter correto.

**Princípio:** Open/Closed — adicionar um novo provider nunca exige alterar código existente, apenas adicionar um novo adapter e registrá-lo no factory.

### 4.2 Factory Pattern — EmailProviderFactory
```typescript
EmailProviderFactory.create(providerConfig: TenantEmailProvider): IEmailProvider
```

### 4.3 Repository Pattern
Todo acesso a dados deve passar pelos repositórios do TypeORM. Nunca usar `EntityManager` direto nas camadas de serviço.

### 4.4 Module Pattern (NestJS)
Cada domínio é encapsulado em um módulo NestJS com responsabilidade única. Módulos só exportam o que outros módulos precisam consumir.

---

## 5. Arquitetura de Processamento Assíncrono

### Fluxo Obrigatório
**Nenhum envio de e-mail ocorre de forma síncrona** dentro do ciclo Request/Response.

```
[Cliente] → POST /email → [API: valida + cria EmailJob no DB + enfileira] → 202 Accepted
                                                    ↓
                                          [Bull Queue: email]
                                                    ↓
                                      [EmailProcessor: Worker]
                                                    ↓
                              [Factory → Provider → Envio real → Atualiza status no DB]
```

### Estados do EmailJob
```
PENDING → PROCESSING → SENT
                     ↘ FAILED (com mensagem de erro e contador de tentativas)
```

### Retry / Backoff
Jobs com falha devem ser reprocessados com backoff exponencial. A configuração de tentativas (máximo 3) e o delay entre elas devem ser configuráveis via variáveis de ambiente.

---

## 6. Entidades do Banco de Dados

### Tenant
Representa um cliente da plataforma.
- `id` (UUID, PK)
- `name` (string)
- `apiKey` (string, unique) — chave de autenticação
- `isActive` (boolean)
- `createdAt`, `updatedAt`

### TenantEmailProvider
Credenciais de envio de um tenant.
- `id` (UUID, PK)
- `tenantId` (FK → Tenant)
- `providerType` (enum: SMTP | MAILGUN | RESEND | SES)
- `config` (jsonb) — credenciais específicas do provider
- `isActive` (boolean)
- `createdAt`

**Config SMTP exemplo:**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "email@example.com",
  "pass": "app-password",
  "fromName": "Meu Serviço"
}
```

### EmailJob
Log e controle de cada job de envio.
- `id` (UUID, PK)
- `tenantId` (FK → Tenant)
- `to` (string)
- `subject` (string)
- `content` (text)
- `status` (enum: PENDING | PROCESSING | SENT | FAILED)
- `attempts` (int, default 0)
- `errorMessage` (text, nullable)
- `createdAt`, `processedAt` (nullable)

---

## 7. Convenções de Código

### Nomenclatura
- **Entidades:** PascalCase, singular (`Tenant`, `EmailJob`)
- **DTOs:** sufixo `DTO` (`SendEmailDTO`, `VerifyTwoFactorDTO`)
- **Interfaces:** prefixo `I` (`IEmailProvider`)
- **Enums:** PascalCase para tipo, SCREAMING_SNAKE_CASE para valores

### Estrutura de Diretórios
```
src/
  common/
    interfaces/      ← contratos (IEmailProvider)
    enums/           ← enums compartilhados
    guards/          ← guards reutilizáveis
  database/
    entities/        ← entidades TypeORM
  providers/
    smtp/            ← SmtpProvider
    mailgun/         ← futuro
    email-provider.factory.ts
  modules/
    tenant/
    email/
    two-factor/
    queue/
  cache/
```

### Tratamento de Erros
- Sempre usar `try/catch` em operações de I/O.
- Logger do NestJS para todos os erros (`@nestjs/common Logger`).
- Nunca expor stack traces para o cliente.
- Usar `HttpException` e seus derivados para erros HTTP.

### Variáveis de Ambiente
Todas as configurações sensíveis ou de ambiente devem vir de `.env` via `ConfigService`. Nunca hardcodar credenciais. Sempre documentar no `.env.example`.

---

## 8. Regras de Segurança

- API Keys dos tenants devem ser armazenadas com hash (bcrypt) — a chave raw só é exibida no momento do cadastro.
- Códigos de 2FA devem ser gerados com `crypto.randomInt` (não `Math.random`).
- TTL do código 2FA: 30 minutos no Redis.
- Credenciais SMTP no `TenantEmailProvider.config` devem ser criptografadas em repouso (futuro).

---

## 9. Endpoints da API (Contrato Estável)

### Email
| Método | Rota | Descrição |
|---|---|---|
| POST | `/email` | Enfileira um e-mail para envio |

**Headers obrigatórios:** `X-Tenant-ID: <uuid>`

**Response:** `202 Accepted` com body `{ jobId, status: "PENDING" }`

### Two-Factor Authentication
| Método | Rota | Descrição |
|---|---|---|
| POST | `/two-factor/send` | Gera e envia código 2FA |
| POST | `/two-factor/verify` | Verifica se o código é válido |

---

## 10. Evolução Planejada (Roadmap)

| Parte | Escopo |
|---|---|
| **Parte 1** | DB + SmtpProvider + Fila assíncrona (Bull) + Email + 2FA funcionais |
| Parte 2 | CRUD de Tenants + autenticação por API Key + middleware de tenant |
| Parte 3 | Envio em massa (batch jobs) + templates de e-mail |
| Parte 4 | Novos adapters (Mailgun, Resend) + dashboard de métricas |
| Parte 5 | Rate limiting por tenant + webhooks de status de entrega |