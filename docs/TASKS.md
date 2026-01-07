# Tarefas do Projeto — MVP

## Fase 1: Setup (2h)

- [ ] Inicializar projeto Node.js com TypeScript
- [ ] Instalar dependências (Fastify, Zod, Axios, Pino)
- [ ] Configurar tsconfig.json
- [ ] Configurar ESLint + Prettier
- [ ] Criar estrutura de pastas
- [ ] Configurar variáveis de ambiente

## Fase 2: Integração Perplexity (4h)

- [ ] Criar `perplexity.service.ts`
- [ ] Implementar chamada à API
- [ ] Definir tipos de resposta
- [ ] Implementar retry com backoff
- [ ] Criar testes unitários do service
- [ ] Testar com query real

## Fase 3: API + Validação (4h)

- [ ] Criar servidor Fastify
- [ ] Implementar `POST /api/v1/search/products`
- [ ] Implementar `GET /api/v1/health`
- [ ] Criar schemas Zod (request/response)
- [ ] Middleware de autenticação (API key)
- [ ] Middleware de rate limiting
- [ ] Middleware de error handling
- [ ] Configurar CORS

## Fase 4: Filtragem (4h)

- [ ] Criar `prompt-builder.ts` com prompts otimizados
- [ ] Criar `parser.ts` para extrair JSON da resposta
- [ ] Criar `filter.service.ts` com heurísticas
- [ ] Implementar validação de schema nos produtos
- [ ] Implementar cálculo de relevance_score
- [ ] Implementar deduplicação
- [ ] Testar com queries diversas

## Fase 5: Testes + Docs (3h)

- [ ] Configurar Vitest
- [ ] Testes de integração dos endpoints
- [ ] Testes do parser e filtros
- [ ] Configurar Swagger/OpenAPI
- [ ] Documentar todos os endpoints
- [ ] Atualizar README com instruções finais

## Fase 6: Refinamento (3h)

- [ ] Testar edge cases
- [ ] Ajustar prompts com base em resultados
- [ ] Melhorar mensagens de erro
- [ ] Code review e limpeza
- [ ] Preparar para deploy

---

## Queries de Teste

Usar para validar funcionamento:

1. `"notebook gamer até 5000 reais"` — deve retornar notebooks
2. `"fone de ouvido bluetooth jbl"` — deve retornar fones JBL
3. `"como fazer bolo de chocolate"` — deve retornar array vazio ou erro
4. `"iphone 15 pro max"` — deve retornar iPhones
5. `"melhor celular custo benefício 2024"` — deve retornar celulares variados
6. `"teclado mecânico rgb"` — deve retornar teclados
7. `"cadeira gamer ergonômica"` — deve retornar cadeiras
