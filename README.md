# Google Shopping Product Search API

API REST para busca de produtos com suporte a **busca real no Google Shopping** (via SerpApi) e **busca assistida por IA** (via Gemini).

## Objetivo

Retornar **exclusivamente produtos relevantes** com base em consultas textuais, oferecendo duas modalidades:
- **Google Shopping Real**: Busca direta nos resultados reais do Google Shopping
- **Busca com IA**: Processamento inteligente via Gemini AI para interpretação avançada

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

# Busca com Google Shopping Real (SerpApi)
curl -X POST http://localhost:3000/api/v1/search/products `
  -H "x-api-key: dev-key-1" `
  -H "Content-Type: application/json" `
  -d '{"query": "notebook gamer ate 5000 reais", "options": {"provider": "serpapi"}}'

# Busca com IA (Gemini) - padrão
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

## Modos de Busca

### 1. Google Shopping Real (SerpApi)
Busca direta nos resultados do Google Shopping sem processamento de IA:
- Produtos reais do Google Shopping
- Preços atualizados em tempo real
- Suporte a filtros (país, idioma, preço, ordenação)
- **Não usa IA** - busca simples e direta
- Requer `SERPAPI_API_KEY`

### 2. Busca com IA (Gemini)
Processamento inteligente de consultas:
- Interpretação avançada via Gemini AI
- Requer `GEMINI_API_KEY`
- Modo padrão se `provider` não for especificado

**Para escolher o modo**, envie `"options": {"provider": "serpapi"}` ou `"options": {"provider": "gemini"}` na requisição.

## Variaveis de Ambiente

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `GEMINI_API_KEY` | Chave da API Gemini | Sim (para busca com IA) |
| `SERPAPI_API_KEY` | Chave da API SerpApi | Sim (para Google Shopping) |
| `PORT` | Porta do servidor | Nao (default: 3000) |
| `ALLOWED_API_KEYS` | API keys permitidas | Sim |

## Licenca

Proprietario - SNOWMANLABS
