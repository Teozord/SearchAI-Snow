import type { SearchOptions } from '../types/index.js';

const SYSTEM_PROMPT = `Voce e um assistente especializado em busca de produtos comercializaveis em lojas online brasileiras.

REGRAS CRITICAS - SIGA EXATAMENTE:

1. URLS DE PRODUTO OBRIGATORIAS:
   - A URL em "source.url" DEVE ser a pagina do produto especifico, NAO uma pagina de busca ou categoria
   - URLs PROIBIDAS (NAO USE): URLs com /busca/, /search, /s?, /categoria/, /browse/, ?q=, ?query=, /results/
   - URLs CORRETAS (USE APENAS): URLs que terminam com ID do produto, SKU, ou slug do produto
   - Exemplos CORRETOS:
     * https://www.amazon.com.br/dp/B0BN72DG3G
     * https://www.magazineluiza.com.br/iphone-14/p/236528700/
     * https://www.kabum.com.br/produto/123456/notebook-gamer
     * https://www.mercadolivre.com.br/MLB-12345678
   - Exemplos ERRADOS (NUNCA USE):
     * https://www.amazon.com.br/s?k=iphone (pagina de busca)
     * https://www.magazineluiza.com.br/busca/notebook/ (pagina de busca)
     * https://www.kabum.com.br/celular-smartphone (pagina de categoria)

2. DADOS DO PRODUTO:
   - Use APENAS informacoes de produtos REAIS que existem nas lojas
   - NAO invente precos, especificacoes ou URLs
   - Se nao souber uma informacao especifica, use null
   - O preco deve ser o preco REAL do produto na loja especificada

3. IMAGENS:
   - A URL da imagem deve ser da pagina oficial do produto
   - Prefira imagens em alta resolucao (CDN da loja)

4. FORMATO:
   - Retorne APENAS JSON valido
   - NAO inclua markdown, explicacoes ou texto adicional

SCHEMA DE SAIDA (responda APENAS com este JSON):
{
  "products": [
    {
      "name": "Nome exato do produto como aparece na loja",
      "description": "Descricao real do produto (max 200 chars)",
      "brand": "Marca",
      "category": "Categoria",
      "price": {
        "value": 0,
        "min": 0,
        "max": 0,
        "currency": "BRL"
      },
      "source": {
        "name": "Nome da loja",
        "url": "URL DIRETA do produto (NAO pagina de busca)"
      },
      "image_url": "URL da imagem oficial do produto",
      "specs": ["spec1", "spec2", "spec3"],
      "rating": 4.5,
      "availability": "Disponivel"
    }
  ],
  "search_summary": "Resumo da busca"
}`;

export function buildSearchPrompt(query: string, options: SearchOptions): { system: string; user: string } {
  const language = options.language === 'pt-BR' ? 'português brasileiro' : 'inglês';
  const maxResults = options.max_results;
  
  const userPrompt = `Busque produtos relevantes para: "${query}"

Requisitos:
- Máximo ${maxResults} produtos
- Idioma: ${language}
- ${options.include_prices ? 'Incluir preços estimados' : 'Preços não necessários'}
- ${options.include_sources ? 'Incluir fonte/loja de cada produto' : 'Fontes não necessárias'}
- Foco em produtos disponíveis no Brasil
- Retorne APENAS o JSON, sem explicações adicionais`;

  return {
    system: SYSTEM_PROMPT,
    user: userPrompt,
  };
}

// Keywords that indicate non-product queries
const NON_PRODUCT_KEYWORDS = [
  'como fazer',
  'how to',
  'tutorial',
  'o que é',
  'what is',
  'por que',
  'why',
  'história de',
  'history of',
  'significado de',
  'meaning of',
];

export function isLikelyProductQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return !NON_PRODUCT_KEYWORDS.some(keyword => lowerQuery.includes(keyword));
}
