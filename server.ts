import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized GoogleGenAI instance
let aiInstance: GoogleGenAI | null = null;

function getGoogleGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A chave GEMINI_API_KEY não foi configurada nas configurações.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Helper: Try multiple models sequentially with a 20-second timeout each to ensure maximum resilience
async function generateWithFallbackAndTimeout(
  ai: GoogleGenAI,
  userPrompt: string,
  systemPrompt: string,
  temperature: number
): Promise<string> {
  const models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`[Merlin Server] Tentando gerar conteúdo usando modelo: ${model}`);
      
      const responsePromise = ai.models.generateContent({
        model: model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: temperature,
        },
      });

      // 20-second timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de 20 segundos atingido para o modelo ${model}.`)), 20000);
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);

      if (response && response.text) {
        console.log(`[Merlin Server] Conteúdo gerado com sucesso pelo modelo: ${model}`);
        return response.text;
      }
      throw new Error(`O modelo ${model} retornou uma resposta sem texto.`);
    } catch (error: any) {
      console.error(`[Merlin Server] Falha ao gerar com modelo ${model}:`, error.message || error);
      lastError = error;
    }
  }

  throw lastError || new Error("Falha ao gerar conteúdo com todos os modelos disponíveis.");
}

// API Route: Generate personalized copy/script for a lead
app.post("/api/gemini/generate-message", async (req, res) => {
  try {
    const { clientName, clientInterest, clientNotes, goal, clientStatus } = req.body;

    if (!clientName) {
      return res.status(400).json({ error: "O nome do cliente é obrigatório." });
    }

    const ai = getGoogleGenAI();

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

    const text = await generateWithFallbackAndTimeout(ai, userPrompt, systemPrompt, 0.7);
    res.json({ text });
  } catch (error: any) {
    console.error("Erro ao gerar mensagem via Gemini:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor ao gerar mensagem com IA." });
  }
});

// API Route: Analyze overall CRM lead statistics and generate actionable recommendations
app.post("/api/gemini/analyze-leads", async (req, res) => {
  try {
    const { clientsSummary, salesCount, totalCommission } = req.body;

    const ai = getGoogleGenAI();

    const systemPrompt = `Você é o Merlin, um consultor estratégico e mentor de vendas de imóveis por inteligência artificial.
Seu papel é analisar a base de dados de leads de um corretor de imóveis e sugerir 3 recomendações táticas urgentes e extremamente acionáveis para aumentar as vendas e evitar perda de oportunidades.`;

    const userPrompt = `Analise a seguinte situação da base de leads do corretor:
- Total de Leads Cadastrados: ${clientsSummary.totalCount}
- Distribuição de Leads por Etapa do Funil:
${JSON.stringify(clientsSummary.stageCounts, null, 2)}
- Quantidade de Vendas Fechadas e Comissões: ${salesCount} vendas, com comissão total acumulada de R$ ${totalCommission.toLocaleString('pt-BR')}
- Alertas e Gargalos Detectados:
  * Leads sem data de retorno agendada: ${clientsSummary.noNextContactCount}
  * Leads "frios/estagnados" sem contato há mais de 15 dias: ${clientsSummary.staleCount}

Com base nestes dados, gere exatamente 3 recomendações táticas bem estruturadas e práticas em português.
Seja direto, motivador e focado em resultados rápidos. Retorne a resposta em formato Markdown limpo, estruturado com títulos claros para cada recomendação.`;

    const text = await generateWithFallbackAndTimeout(ai, userPrompt, systemPrompt, 0.75);
    res.json({ text });
  } catch (error: any) {
    console.error("Erro ao analisar base de leads via Gemini:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor ao analisar leads com IA." });
  }
});

// API Route: Conversation with Merlin Assistant using CRM Context
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, clients, tasks, sales, engineResult } = req.body;

    if (!message) {
      return res.status(400).json({ error: "A mensagem do usuário é obrigatória." });
    }

    const ai = getGoogleGenAI();

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

    const text = await generateWithFallbackAndTimeout(ai, userPrompt, systemPrompt, 0.75);
    res.json({ text });
  } catch (error: any) {
    console.error("Erro no chat do Merlin:", error);
    res.status(500).json({ error: error.message || "Erro interno do servidor no chat do Merlin." });
  }
});

// Serve frontend assets using Vite middleware or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Merlin Server] Rodando com sucesso na porta ${PORT}`);
  });
}

startServer();
