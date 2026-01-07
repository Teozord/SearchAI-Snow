# Escopo Técnico — API de Busca de Produtos com Perplexity AI

**Versão:** 1.0  
**Data:** 08/12/2024  
**Status:** Planejamento

---

## 1. Objetivo Geral

Desenvolver uma API REST própria que utiliza a API da Perplexity AI como motor de busca inteligente, retornando **exclusivamente produtos relevantes** com base em consultas textuais do usuário.

### 1.1 Objetivos Específicos

| # | Objetivo | Métrica de Sucesso |
|---|----------|-------------------|
| 1 | Integrar com a API da Perplexity de forma segura e eficiente | Latência < 3s por requisição |
| 2 | Filtrar respostas para retornar apenas produtos | Taxa de precisão > 95% |
| 3 | Estruturar dados de produtos em formato padronizado (JSON) | Schema validável 100% |
| 4 | Implementar sistema de logs e métricas | Rastreabilidade completa |
| 5 | Garantir segurança no manuseio de chaves e dados | Zero exposição de credenciais |

---

## 2. Fluxo de Funcionamento

```
???????????????     ????????????????????     ???????????????????     ???????????????????
?   Usuário   ???????    Minha API     ???????  Perplexity AI  ???????    Resposta     ?
?  (Cliente)  ?     ?   (Backend)      ?     ?     (LLM)       ?     ?    Bruta        ?
???????????????     ????????????????????     ???????????????????     ???????????????????
                                                                              ?
                    ????????????????????     ???????????????????              ?
                    ?  Resposta Final  ???????   Filtragem &   ????????????????
                    ?  (Produtos JSON) ?     ?   Validação     ?
                    ????????????????????     ???????????????????
```

### 2.1 Detalhamento do Fluxo

1. **Entrada do Usuário**
   - Cliente envia requisição POST com query de busca textual
   - Exemplo: `"notebook gamer até 5000 reais"`

2. **Pré-processamento (Minha API)**
   - Validação da entrada (sanitização, limite de caracteres)
   - Rate limiting por IP/token
   - Construção do prompt otimizado para extração de produtos

3. **Chamada à Perplexity**
   - Envio do prompt estruturado via API
   - Configuração de parâmetros (modelo, temperatura, max_tokens)

4. **Pós-processamento**
   - Parsing da resposta
   - Aplicação de filtros para extrair apenas produtos
   - Estruturação em schema padronizado

5. **Resposta ao Cliente**
   - JSON com lista de produtos filtrados
   - Metadados (tempo de resposta, quantidade de resultados)

---

## 3. Módulos e Responsabilidades

### 3.1 Arquitetura de Módulos

```
src/
??? api/                    # Camada de apresentação
?   ??? routes/             # Definição de endpoints
?   ??? middlewares/        # Auth, rate-limit, logging
?   ??? validators/         # Schemas de validação (Zod/Joi)
?
??? services/               # Lógica de negócio
?   ??? search.service.ts   # Orquestração da busca
?   ??? perplexity.service.ts # Integração com Perplexity
?   ??? filter.service.ts   # Filtragem de produtos
?
??? utils/                  # Utilitários
?   ??? prompt-builder.ts   # Construção de prompts
?   ??? parser.ts           # Parsing de respostas
?   ??? logger.ts           # Sistema de logs
?
??? config/                 # Configurações
?   ??? index.ts            # Env vars, constantes
?
??? types/                  # Definições TypeScript
    ??? index.ts            # Interfaces e tipos
```

### 3.2 Responsabilidades por Módulo

| Módulo | Responsabilidade | Dependências |
|--------|-----------------|--------------|
| **api/routes** | Expor endpoints REST, documentar com OpenAPI | validators, services |
| **api/middlewares** | Autenticação, rate limiting, CORS, error handling | config, logger |
| **api/validators** | Validar inputs/outputs com schemas | Zod |
| **services/search** | Orquestrar fluxo completo de busca | perplexity, filter |
| **services/perplexity** | Comunicação direta com API Perplexity | axios, config |
| **services/filter** | Extrair e validar produtos da resposta | parser |
| **utils/prompt-builder** | Montar prompts otimizados | - |
| **utils/logger** | Logs estruturados (JSON) | Winston/Pino |

---

## 4. Estrutura da API

### 4.1 Endpoints

#### `POST /api/v1/search/products`

**Descrição:** Realiza busca de produtos baseada em texto.

**Headers:**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "smartphone samsung até 2000 reais",
  "options": {
    "max_results": 10,
    "language": "pt-BR",
    "include_prices": true,
    "include_sources": true
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "name": "Samsung Galaxy A54 5G",
        "description": "Smartphone com tela de 6.4 polegadas...",
        "price": {
          "value": 1899.00,
          "currency": "BRL",
          "formatted": "R$ 1.899,00"
        },
        "source": {
          "name": "Magazine Luiza",
          "url": "https://..."
        },
        "relevance_score": 0.95
      }
    ],
    "total_found": 8,
    "query_interpreted": "smartphones Samsung com preço até R$ 2.000"
  },
  "meta": {
    "request_id": "uuid-v4",
    "response_time_ms": 1234,
    "model_used": "llama-3.1-sonar-large-128k-online"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query must be between 3 and 500 characters",
    "details": []
  }
}
```

---

#### `GET /api/v1/health`

**Descrição:** Verifica status da API.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "perplexity_status": "connected"
}
```

---

### 4.2 Regras de Validação

| Campo | Tipo | Regras |
|-------|------|--------|
| `query` | string | Obrigatório, 3-500 caracteres, sanitizado |
| `max_results` | number | Opcional, default 10, max 50 |
| `language` | string | Opcional, enum: pt-BR, en-US |
| `include_prices` | boolean | Opcional, default true |
| `include_sources` | boolean | Opcional, default true |

### 4.3 Códigos de Erro

| Código | HTTP Status | Descrição |
|--------|-------------|-----------|
| `VALIDATION_ERROR` | 400 | Input inválido |
| `UNAUTHORIZED` | 401 | API key inválida/ausente |
| `RATE_LIMIT_EXCEEDED` | 429 | Limite de requisições excedido |
| `PERPLEXITY_ERROR` | 502 | Erro na API externa |
| `INTERNAL_ERROR` | 500 | Erro interno do servidor |

---

## 5. Estratégia de Filtragem de Produtos

### 5.1 Técnicas Implementadas

#### A) Prompt Engineering Estruturado

```typescript
const SYSTEM_PROMPT = `
Você é um assistente especializado em busca de produtos.
REGRAS OBRIGATÓRIAS:
1. Retorne APENAS produtos físicos ou digitais comercializáveis
2. Cada produto DEVE ter: nome, descrição, preço estimado, fonte
3. NÃO inclua: artigos, tutoriais, reviews sem produto, comparativos genéricos
4. Formate a resposta como JSON válido seguindo o schema fornecido
5. Se não encontrar produtos, retorne array vazio

SCHEMA DE SAÍDA:
{
  "products": [
    {
      "name": "string",
      "description": "string (max 200 chars)",
      "price": { "min": number, "max": number, "currency": "BRL" },
      "source": { "name": "string", "url": "string" }
    }
  ]
}
`;
```

#### B) Validação de Schema (Pós-processamento)

```typescript
const productSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(500),
  price: z.object({
    min: z.number().positive().optional(),
    max: z.number().positive().optional(),
    currency: z.enum(['BRL', 'USD'])
  }).optional(),
  source: z.object({
    name: z.string(),
    url: z.string().url()
  }).optional()
});
```

#### C) Heurísticas de Filtragem

| Regra | Descrição | Ação |
|-------|-----------|------|
| **Palavras-chave negativas** | Detectar "como fazer", "tutorial", "review de" | Remover item |
| **Ausência de preço** | Produto sem nenhuma indicação de preço | Marcar como "preço não disponível" |
| **Score de confiança** | Calcular relevância baseada em campos preenchidos | Ordenar por score |
| **Deduplicação** | Produtos iguais de fontes diferentes | Manter o com melhor preço |

#### D) Fallback e Retry

- Se resposta não contiver JSON válido ? retry com prompt mais restritivo
- Se < 3 produtos retornados ? busca complementar com query expandida
- Máximo de 2 retries por requisição

---

## 6. Requisitos Técnicos

### 6.1 Stack Tecnológico

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| **Runtime** | Node.js 20 LTS | Ecossistema maduro, async nativo |
| **Framework** | Fastify | Performance superior ao Express |
| **Linguagem** | TypeScript 5.x | Type-safety, melhor DX |
| **Validação** | Zod | Schema validation + inference |
| **HTTP Client** | Axios | Interceptors, retry nativo |
| **Logs** | Pino | JSON logs, baixa overhead |
| **Testes** | Vitest + Supertest | Fast, ESM nativo |
| **Docs** | Swagger/OpenAPI | Auto-geração de docs |

### 6.2 Ambiente e Configuração

**Variáveis de Ambiente (.env):**
```env
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Perplexity
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxx
PERPLEXITY_BASE_URL=https://api.perplexity.ai
PERPLEXITY_MODEL=llama-3.1-sonar-large-128k-online
PERPLEXITY_TIMEOUT_MS=30000

# Security
API_KEY_HEADER=x-api-key
ALLOWED_API_KEYS=key1,key2,key3
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Optional
REDIS_URL=redis://localhost:6379
```

### 6.3 Segurança

| Aspecto | Implementação |
|---------|---------------|
| **API Keys** | Armazenadas em variáveis de ambiente, nunca no código |
| **Autenticação** | Header `x-api-key` validado em middleware |
| **Rate Limiting** | Por IP e por API key (100 req/min default) |
| **Input Sanitization** | Escape de caracteres especiais, limite de tamanho |
| **CORS** | Configurável por ambiente |
| **Logs** | Sem dados sensíveis (keys mascaradas) |
| **HTTPS** | Obrigatório em produção |

---

## 7. MVP — Minimum Viable Product

### 7.1 Escopo do MVP

**Incluso no MVP:**
- [x] Endpoint `POST /api/v1/search/products`
- [x] Endpoint `GET /api/v1/health`
- [x] Integração básica com Perplexity
- [x] Prompt engineering para extração de produtos
- [x] Validação de entrada (Zod)
- [x] Parsing e estruturação da resposta
- [x] Autenticação por API key
- [x] Rate limiting básico (in-memory)
- [x] Logs estruturados
- [x] Documentação OpenAPI
- [x] Testes unitários básicos

**Excluído do MVP (v2+):**
- [ ] Cache com Redis
- [ ] Múltiplos modelos de LLM
- [ ] Histórico de buscas
- [ ] Analytics avançado
- [ ] Dashboard de administração
- [ ] Webhooks

### 7.2 Cronograma MVP

| Fase | Duração | Entregas |
|------|---------|----------|
| **Setup** | 2h | Projeto estruturado, deps instaladas |
| **Integração Perplexity** | 4h | Service funcionando, testes |
| **API + Validação** | 4h | Endpoints, middlewares, schemas |
| **Filtragem** | 4h | Prompt otimizado, parser, heurísticas |
| **Testes + Docs** | 3h | Vitest, Swagger, README |
| **Refinamento** | 3h | Bug fixes, edge cases |

**Total estimado: 20 horas**

### 7.3 Validação do MVP

#### Critérios de Aceite

1. **Funcional:**
   ```bash
   # Deve retornar produtos válidos
   curl -X POST http://localhost:3000/api/v1/search/products \
     -H "x-api-key: test-key" \
     -H "Content-Type: application/json" \
     -d '{"query": "fone de ouvido bluetooth"}'
   
   # Response deve conter array de produtos com name, description, price
   ```

2. **Performance:**
   - Tempo de resposta end-to-end < 5s (P95)
   - Resposta estruturada em JSON válido 100%

3. **Qualidade:**
   - Cobertura de testes > 70%
   - Zero erros de TypeScript
   - Documentação OpenAPI acessível em `/docs`

#### Casos de Teste Principais

| # | Cenário | Input | Expected Output |
|---|---------|-------|-----------------|
| 1 | Busca válida | "iphone 15" | Array com produtos Apple |
| 2 | Query vazia | "" | Erro 400 VALIDATION_ERROR |
| 3 | Sem API key | - | Erro 401 UNAUTHORIZED |
| 4 | Query sem produtos | "como fazer bolo" | Array vazio ou erro |
| 5 | Rate limit | 101 requests/min | Erro 429 |

---

## 8. Melhorias Futuras

### 8.1 Curto Prazo (v1.1 - v1.3)

| Feature | Benefício | Complexidade |
|---------|-----------|--------------|
| **Cache Redis** | Reduz custos com API, melhora latência | Média |
| **Retry com backoff** | Resiliência a falhas temporárias | Baixa |
| **Múltiplos idiomas** | Expande mercado | Baixa |
| **Filtros avançados** | Categoria, faixa de preço, marca | Média |

### 8.2 Médio Prazo (v2.0)

| Feature | Benefício | Complexidade |
|---------|-----------|--------------|
| **Histórico de buscas** | Personalização, analytics | Média |
| **Comparador de preços** | Valor agregado ao usuário | Alta |
| **Webhooks** | Integrações assíncronas | Média |
| **Multi-tenant** | Escala para múltiplos clientes | Alta |

### 8.3 Longo Prazo (v3.0+)

| Feature | Benefício | Complexidade |
|---------|-----------|--------------|
| **Fine-tuning próprio** | Maior precisão na extração | Muito Alta |
| **Agregador multi-API** | Redundância, mais fontes | Alta |
| **Recomendação ML** | Personalização avançada | Muito Alta |

---

## 9. Limites da API Perplexity

### 9.1 Limitações Técnicas

| Limitação | Descrição | Mitigação |
|-----------|-----------|-----------|
| **Rate Limits** | Varia por plano (free: ~50/min) | Cache, queue de requisições |
| **Latência** | 2-10s por request | Timeout configurável, UX com loading |
| **Tokens** | Max ~4000 tokens por resposta | Limitar `max_results` |
| **Custo** | $0.20-1.00 por 1M tokens | Cache agressivo |

### 9.2 Limitações de Conteúdo

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| **Dados em tempo real** | Preços podem estar desatualizados | Disclaimer + timestamp |
| **Disponibilidade** | Não garante estoque | Não prometer disponibilidade |
| **Precisão de preços** | Valores aproximados | Exibir como "a partir de" |
| **Cobertura geográfica** | Foco em fontes em inglês/português | Especificar região no prompt |
| **Alucinações** | Pode inventar produtos | Validação rigorosa + score |

### 9.3 Boas Práticas

1. **Sempre incluir disclaimer:** "Preços e disponibilidade sujeitos a alteração"
2. **Não usar para decisões críticas:** Informação é indicativa
3. **Validar URLs:** Links podem estar quebrados
4. **Monitorar qualidade:** Amostragem manual periódica
5. **Feedback loop:** Permitir usuários reportarem erros

---

## 10. Próximos Passos

1. **Imediato:** Obter API key da Perplexity (https://www.perplexity.ai/settings/api)
2. **Dia 1:** Setup do projeto, estrutura de pastas, configuração TypeScript
3. **Dia 2-3:** Implementação do MVP
4. **Dia 4:** Testes, documentação, refinamento
5. **Dia 5:** Deploy em ambiente de staging (Render/Railway)

---

## Anexos

### A. Exemplo de Prompt Completo

```
SYSTEM:
Você é um assistente de busca de produtos. Retorne APENAS produtos comercializáveis em formato JSON.

USER:
Busque produtos relevantes para: "notebook para programação até 4000 reais"

Retorne no formato:
{
  "products": [
    {
      "name": "Nome do produto",
      "description": "Descrição breve",
      "price": {"min": 0, "max": 0, "currency": "BRL"},
      "source": {"name": "Loja", "url": "https://..."},
      "specs": ["spec1", "spec2"]
    }
  ],
  "search_summary": "Resumo da busca realizada"
}

Regras:
- Máximo 10 produtos
- Apenas produtos disponíveis no Brasil
- Incluir especificações técnicas relevantes
- Ordenar por relevância
```

### B. Referências

- [Perplexity API Docs](https://docs.perplexity.ai/)
- [Fastify Documentation](https://fastify.dev/)
- [Zod Documentation](https://zod.dev/)

---

*Documento gerado como parte do planejamento técnico. Sujeito a alterações durante o desenvolvimento.*
