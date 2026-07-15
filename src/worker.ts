export interface Env {
  GEMINI_API_KEY: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Função auxiliar resiliente com fallback de modelos e timeout
async function generateWithFallbackAndTimeout(
  apiKey: string,
  userPrompt: string,
  systemPrompt: string,
  temperature: number
): Promise<string> {
  const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[Cloudflare Worker] Tentando gerar conteúdo usando modelo: ${model}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "aistudio-build",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: temperature
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json() as any;
      
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`[Cloudflare Worker] Conteúdo gerado com sucesso pelo modelo: ${model}`);
        return data.candidates[0].content.parts[0].text;
      }
      
      if (data.error) {
        throw new Error(`Erro da API Gemini: ${data.error.message || JSON.stringify(data.error)}`);
      }

      throw new Error(`O modelo ${model} retornou uma resposta em formato inesperado.`);
    } catch (error: any) {
      const msg = error.name === "AbortError" 
        ? `Timeout de 20 segundos atingido para o modelo ${model}.` 
        : (error.message || error);
      console.error(`[Cloudflare Worker] Falha ao gerar com modelo ${model}:`, msg);
      lastError = new Error(msg);
    }
  }

  throw lastError || new Error("Falha ao gerar conteúdo com todos os modelos disponíveis.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Tratar requisição OPTIONS para CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Roteamento
    if (path === "/api/gemini/generate-message") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Método não permitido" }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "A variável de ambiente GEMINI_API_KEY não está configurada no Cloudflare Worker." }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const body: any = await request.json();
        const { clientName, clientInterest, clientNotes, goal, clientStatus } = body;

        if (!clientName) {
          return new Response(
            JSON.stringify({ error: "O nome do cliente é obrigatório." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const systemPrompt = `Você é o Merlin, um assistente virtual e especialista em copywriting para corretores de imóveis de alto desempenho.
Seu objetivo é criar mensagens de abordagem curtas, humanas, extremamente persuasivas e amigáveis para envio via WhatsApp ou Email.
Evite textos excessivamente formais, robóticos, artificiais ou repletos de jargões técnicos. Seja simpático, natural, direto ao ponto e focado em gerar conexão. Use quebras de linha e emojis com moderação para tornar a leitura agradável.`;

        const userPrompt = `Crie um script personalizado de abordagem rápida para o seguinte cliente:
- Nome do Cliente: ${clientName}
- Empreendimento de Interesse: ${clientInterest || "Não especificado ainda"}
- Perfil/Notas do Cliente: ${clientNotes || "Sem observações adicionais"}
- Etapa atual do Funil: ${clientStatus || "Lead Novo"}
- Objetivo da mensagem: ${goal || "Fazer um contato inicial para entender as necessidades"}

Instruções Adicionais:
- Escreva a mensagem em português do Brasil.
- A mensagem deve parecer escrita manualmente por um corretor de imóveis real (humanizado, amigável).
- Use o nome do cliente no início de forma natural.
- Tenha um gancho de chamada para ação claro (Call to Action), convidando para uma resposta simples ou um agendamento rápido de conversa.
- Retorne APENAS a mensagem pronta, sem introduções ou explicações.`;

        const text = await generateWithFallbackAndTimeout(apiKey, userPrompt, systemPrompt, 0.7);

        return new Response(JSON.stringify({ text }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (error: any) {
        console.error("Erro no Worker generate-message:", error);
        return new Response(
          JSON.stringify({ error: error.message || "Erro interno ao gerar mensagem." }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    if (path === "/api/gemini/analyze-leads") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Método não permitido" }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "A variável de ambiente GEMINI_API_KEY não está configurada no Cloudflare Worker." }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const body: any = await request.json();
        const { clientsSummary, salesCount, totalCommission } = body;

        const summary = clientsSummary || {
          totalCount: 0,
          noNextContactCount: 0,
          staleCount: 0,
          stageCounts: {}
        };

        const sales = salesCount !== undefined ? salesCount : 0;
        const commission = totalCommission !== undefined ? totalCommission : 0;

        const systemPrompt = `Você é o Merlin, um consultor estratégico e mentor de vendas de imóveis por inteligência artificial.
Seu papel é analisar a base de dados de leads de um corretor de imóveis e sugerir 3 recomendações táticas urgentes e extremamente acionáveis para aumentar as vendas e evitar perda de oportunidades.`;

        const userPrompt = `Analise a seguinte situação da base de leads do corretor:
- Total de Leads Cadastrados: ${summary.totalCount}
- Distribuição de Leads por Etapa do Funil:
${JSON.stringify(summary.stageCounts, null, 2)}
- Quantidade de Vendas Fechadas e Comissões: ${sales} vendas, com comissão total acumulada de R$ ${commission.toLocaleString("pt-BR")}
- Alertas e Gargalos Detectados:
  * Leads sem data de retorno agendada: ${summary.noNextContactCount}
  * Leads "frios/estagnados" sem contato há mais de 15 dias: ${summary.staleCount}

Com base nestes dados, gere exatamente 3 recomendações táticas bem estruturadas e práticas em português.
Seja direto, motivador e focado em resultados rápidos. Retorne a resposta em formato Markdown limpo, estruturado com títulos claros para cada recomendação.`;

        const text = await generateWithFallbackAndTimeout(apiKey, userPrompt, systemPrompt, 0.75);

        return new Response(JSON.stringify({ text }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (error: any) {
        console.error("Erro no Worker analyze-leads:", error);
        return new Response(
          JSON.stringify({ error: error.message || "Erro interno ao analisar leads." }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    if (path === "/api/gemini/chat") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Método não permitido" }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "A variável de ambiente GEMINI_API_KEY não está configurada no Cloudflare Worker." }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const body: any = await request.json();
        const { message, history, clients, tasks, sales, engineResult } = body;

        if (!message) {
          return new Response(
            JSON.stringify({ error: "A mensagem do usuário é obrigatória." }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Serialize basic statistics for prompt injection
        const totalLeads = clients ? clients.length : 0;
        const salesCount = sales ? sales.length : 0;
        const totalCommission = sales ? sales.reduce((sum: number, sale: any) => sum + (sale.commissionValue || 0), 0) : 0;

        const clientsListBrief = clients ? clients.map((c: any) => ({
          name: c.name,
          phone: c.phone,
          status: c.status,
          empreendimento: c.empreendimento || "Nenhum",
          origem: c.origem || "Não informado",
          notes: c.notes || "",
          lastContactDate: c.lastContactDate || "",
          nextContactDate: c.nextContactDate || "",
          tags: c.tags || []
        })) : [];

        const prioritiesBrief = engineResult?.priorities ? engineResult.priorities.map((p: any) => ({
          clientName: p.clientName,
          title: p.title,
          description: p.description,
          severity: p.severity
        })) : [];

        const alertsBrief = engineResult?.alerts ? engineResult.alerts.map((a: any) => ({
          clientName: a.clientName,
          title: a.title,
          description: a.description,
          category: a.category
        })) : [];

        const todayTasksBrief = engineResult?.todayTasks ? engineResult.todayTasks.map((t: any) => ({
          clientName: t.clientName,
          title: t.title,
          description: t.description
        })) : [];

        const overdueTasksBrief = engineResult?.overdueTasks ? engineResult.overdueTasks.map((t: any) => ({
          clientName: t.clientName,
          title: t.title,
          description: t.description
        })) : [];

        const systemPrompt = `Você é o Merlin, o assistente comercial pessoal e consultor estratégico de vendas integrado ao CRM de um corretor de imóveis chamado Wesley.
Sua personalidade é extremamente humana, prestativa, entusiasmada, direta, confiante e focada em resultados reais de vendas (fechar negócios, resgatar contatos e gerenciar tarefas de forma impecável).
O cérebro do Merlin é a IA, seus dados são o CRM, seus olhos são o Rules Engine e o chat é a sua forma de se comunicar.

Aqui estão os dados reais da carteira do Wesley no CRM neste momento. Baseie suas respostas 100% nestes dados! Se o Wesley pedir para preparar mensagens ou analisar clientes, cite apenas pessoas que realmente existam nesta lista:

1. CLIENTES CADASTRADOS (Total: ${totalLeads}):
${JSON.stringify(clientsListBrief.slice(0, 40), null, 2)}

2. ANÁLISE DO RULES ENGINE (OLHOS DO MERLIN):
- Clientes de Alta Prioridade: ${JSON.stringify(prioritiesBrief, null, 2)}
- Alertas e Gargalos Gerais: ${JSON.stringify(alertsBrief, null, 2)}
- Tarefas Agendadas para Hoje: ${JSON.stringify(todayTasksBrief, null, 2)}
- Tarefas Atrasadas/Pendentes: ${JSON.stringify(overdueTasksBrief, null, 2)}

3. DADOS DE VENDAS E PERFORMANCE:
- Quantidade de vendas fechadas: ${salesCount}
- Comissão acumulada do corretor: R$ ${totalCommission.toLocaleString('pt-BR')}

Diretrizes de resposta (Siga à risca!):
- Cumprimente o corretor tratando-o carinhosamente de "Wesley" (ou "corretor" se de alguma forma o nome não encaixar). Ex: "Olá, Wesley! 👋" ou "Bom dia, Wesley!".
- Quando ele perguntar "quais clientes chamar hoje?", "o que fazer hoje?" ou "quais as prioridades?", faça uma síntese direta dos Clientes de Alta Prioridade e Tarefas Atrasadas. Cite os nomes deles e as ações recomendadas (ex: "João Silva - pendente de simulação há 5 dias"). Organize em formato de lista Markdown elegante.
- Se ele solicitar scripts ou mensagens para um cliente (ex: "Crie uma mensagem para a Franciene"), procure o cliente pelo nome aproximado nos Clientes Cadastrados. Se achar, use o empreendimento dele e o histórico para formular uma mensagem de WhatsApp fantástica, amigável, humana, natural, com quebras de linha e gatilhos amigáveis (ex: "Oi Franciene, tudo bem? Vi aqui que..."). Retorne o texto pronto para ser copiado. Se não achar o cliente por esse nome exato, pergunte educadamente sobre qual cliente ele está se referindo ou peça mais detalhes.
- Se ele pedir uma análise geral ou de performance da carteira, use os dados acima para destacar pontos fortes e os principais gargalos (ex: "Você tem X clientes sem retorno marcado. Vamos agendar para eles hoje?").
- Use sempre um tom profissional de parceria, de um gerente ou mentor que quer ver o Wesley bater a meta de comissão acumulada (atualmente de R$ ${totalCommission.toLocaleString('pt-BR')}).
- Apresente tudo formatado de forma limpa, com subtítulos e bullet points, mas NUNCA mostre estruturas de código JSON na resposta final para o Wesley.`;

        const userPrompt = `Histórico recente do chat:
${history ? history.map((h: any) => `${h.sender === "user" ? "Corretor" : "Merlin"}: ${h.text}`).join("\n") : ""}

Última mensagem do Corretor (Wesley):
"${message}"

Escreva sua resposta de forma direta, amigável e extremamente acionável:`;

        const text = await generateWithFallbackAndTimeout(apiKey, userPrompt, systemPrompt, 0.75);

        return new Response(JSON.stringify({ text }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (error: any) {
        console.error("Erro no Worker chat:", error);
        return new Response(
          JSON.stringify({ error: error.message || "Erro interno no chat do Merlin." }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Para qualquer outra requisição, como o Cloudflare Worker moderno (wrangler v3 com assets)
    // servirá os arquivos estáticos da pasta dist automaticamente a partir da configuração wrangler.toml,
    // retornamos 404 apenas caso não encontre nenhum arquivo estático correspondente.
    return new Response("Not Found", { status: 404 });
  }
};
