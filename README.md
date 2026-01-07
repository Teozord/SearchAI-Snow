# Perplexity Product Search API

API REST para busca de produtos utilizando Perplexity AI como motor de busca inteligente.

## Objetivo

Retornar **exclusivamente produtos relevantes** com base em consultas textuais, filtrando e estruturando as respostas da Perplexity AI.

## Documentacao

- [Escopo Tecnico Completo](./docs/ESCOPO_TECNICO.md)

## Quick Start com Docker (Recomendado para Windows)

```powershell
# 1. Copiar arquivo de ambiente
copy .env.example .env

# 2. Iniciar com Docker
docker-compose up --build

# 3. Acessar
# API: http://localhost:3000/api/v1/health
# Docs: http://localhost:3000/docs
```

## Quick Start Local (sem Docker)

```powershell
# 1. Instalar dependencias
npm install

# 2. Configurar variaveis de ambiente
copy .env.example .env

# 3. Iniciar em desenvolvimento
npm run dev
```

## Testar a API

```powershell
# Health check
curl http://localhost:3000/api/v1/health

# Busca de produtos
curl -X POST http://localhost:3000/api/v1/search/products `
  -H "x-api-key: dev-key-1" `
  -H "Content-Type: application/json" `
  -d '{"query": "notebook gamer ate 5000 reais"}'
```

## Endpoints

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/v1/search/products` | Busca de produtos |
| GET | `/api/v1/health` | Health check |

## Stack

- **Runtime:** Node.js 20
- **Framework:** Fastify
- **Linguagem:** TypeScript
- **Validacao:** Zod
- **Docs:** OpenAPI/Swagger

## Estrutura

```
src/
??? api/           # Routes, middlewares, validators
??? services/      # Business logic
??? utils/         # Helpers
??? config/        # Configuration
??? types/         # TypeScript definitions
```

## Variaveis de Ambiente

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `PERPLEXITY_API_KEY` | Chave da API Perplexity | Sim |
| `PORT` | Porta do servidor | Nao (default: 3000) |
| `ALLOWED_API_KEYS` | API keys permitidas | Sim |

## Licenca

Proprietario - SNOWMANLABS
