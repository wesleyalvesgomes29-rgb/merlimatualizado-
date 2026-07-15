import React, { useState, useRef, useEffect } from 'react';
import { Client, Sale, Task } from '../types';
import { EngineResult } from '../modules/rulesEngine/types';
import { 
  Send, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  MessageSquare, 
  User, 
  Lightbulb, 
  TrendingUp, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'merlin';
  text: string;
  timestamp: Date;
}

interface MerlinChatProps {
  clients: Client[];
  tasks: Task[];
  sales: Sale[];
  engineResult?: EngineResult;
  compact?: boolean;
  onSelectClient?: (id: string) => void;
}

export default function MerlinChat({
  clients,
  tasks,
  sales,
  engineResult,
  compact = false,
  onSelectClient
}: MerlinChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize messages with an assistant greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      const highPriorityCount = engineResult?.priorities?.length || 0;
      const todayTasksCount = engineResult?.todayTasks?.length || 0;
      const overdueTasksCount = engineResult?.overdueTasks?.length || 0;
      const totalAlerts = (engineResult?.alerts?.length || 0);

      let greetingText = `Olá, corretor! 👋 Eu sou o **Merlin**, seu Assistente Comercial Inteligente. \n\nAcabei de processar os dados da sua carteira de clientes usando o **Rules Engine** e identifiquei o seguinte status para hoje: \n`;

      if (highPriorityCount > 0) {
        greetingText += `🔥 **${highPriorityCount}** cliente${highPriorityCount > 1 ? 's com alta prioridade' : ' com alta prioridade'} precisando de contato urgente.\n`;
      }
      if (todayTasksCount > 0 || overdueTasksCount > 0) {
        greetingText += `📅 **${todayTasksCount + overdueTasksCount}** tarefa${(todayTasksCount + overdueTasksCount) > 1 ? 's comerciais pendentes' : ' comercial pendente'} para hoje.\n`;
      }
      if (totalAlerts > 0) {
        greetingText += `⚠️ **${totalAlerts}** alerta${totalAlerts > 1 ? 's de gargalo' : ' de gargalo'} na base (como leads estagnados ou sem retorno).\n`;
      }

      greetingText += `\nComo posso te ajudar agora? Você pode me pedir para:
- **"Quais clientes devo chamar hoje?"** para ver as prioridades absolutas.
- **"Crie uma mensagem para [Nome do Cliente]"** para gerar uma abordagem personalizada de WhatsApp.
- **"Como está meu faturamento?"** para um resumo estratégico de suas comissões.`;

      setMessages([
        {
          id: 'welcome',
          sender: 'merlin',
          text: greetingText,
          timestamp: new Date()
        }
      ]);
    }
  }, [engineResult, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10).map(m => ({ sender: m.sender, text: m.text })),
          clients,
          tasks,
          sales,
          engineResult
        })
      });

      if (!response.ok) {
        throw new Error(`Erro do servidor (Código ${response.status})`);
      }

      const data = await response.json();
      const replyText = data.text || 'Desculpe, corretor, tive um problema ao processar sua solicitação.';

      setMessages(prev => [
        ...prev,
        {
          id: `merlin-${Date.now()}`,
          sender: 'merlin',
          text: replyText,
          timestamp: new Date()
        }
      ]);
    } catch (error: any) {
      console.error('[MerlinChat] Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'merlin',
          text: `⚠️ **Ops, corretor!** Tive uma falha de conexão temporária ao consultar meu cérebro de IA: *${error.message || 'Verifique se o servidor está rodando.'}*\n\nTente novamente em alguns instantes.`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    // Clean markdown before copying if it has message markers
    const cleanText = text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parseBoldAndFormatting = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      
      // Simple list render
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const bulletText = trimmed.substring(1).trim();
        return (
          <li key={lineIdx} className="ml-4 list-disc text-sm mb-1 leading-relaxed text-slate-700 dark:text-slate-300">
            {formatInlineText(bulletText)}
          </li>
        );
      }
      
      // Simple headers
      if (trimmed.startsWith('###')) {
        return (
          <h4 key={lineIdx} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1.5 font-display">
            {formatInlineText(trimmed.replace('###', '').trim())}
          </h4>
        );
      }
      if (trimmed.startsWith('##')) {
        return (
          <h3 key={lineIdx} className="text-base font-extrabold text-teal-600 dark:text-teal-400 mt-4 mb-2 font-display">
            {formatInlineText(trimmed.replace('##', '').trim())}
          </h3>
        );
      }
      if (trimmed.startsWith('#')) {
        return (
          <h2 key={lineIdx} className="text-lg font-black text-slate-900 dark:text-white mt-5 mb-2.5 font-display">
            {formatInlineText(trimmed.replace('#', '').trim())}
          </h2>
        );
      }

      // Empty line
      if (trimmed === '') {
        return <div key={lineIdx} className="h-2" />;
      }

      // Paragraph
      return (
        <p key={lineIdx} className="text-sm text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">
          {formatInlineText(trimmed)}
        </p>
      );
    });
  };

  const formatInlineText = (text: string) => {
    // Parse bold text **example**
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800/60 px-1 py-0.2 rounded-md">{part}</strong>;
      }
      return part;
    });
  };

  const suggestionChips = [
    { label: '🔥 Quem chamar hoje?', text: 'Merlin, quais clientes devo chamar hoje?' },
    { label: '📈 Análise da minha Carteira', text: 'Merlin, faça uma auditoria estratégica rápida na minha base de leads.' },
    { label: '💬 Mensagem para Franciene', text: 'Crie uma mensagem amigável para enviar para a Franciene agora.' },
    { label: '💡 Destravar leads frios', text: 'Me dê dicas e scripts táticos de como reativar leads que sumiram há semanas.' }
  ];

  return (
    <div className={`flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden ${
      compact ? 'h-[380px]' : 'h-[620px] shadow-2xl'
    }`} id="merlin-chat-container">
      {/* Header Banner */}
      <div className="bg-slate-900 p-4 border-b border-slate-850 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-xl shadow-lg shadow-teal-500/20">
            <Sparkles className="h-4.5 w-4.5 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm text-white tracking-tight">Conversa com Merlin</h2>
              <span className="text-[8px] bg-teal-500/10 text-teal-300 border border-teal-500/25 px-1 rounded-sm uppercase font-black">Online</span>
            </div>
            <p className="text-[10px] text-slate-400">Seu gerente comercial integrado de IA</p>
          </div>
        </div>
        {!compact && (
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Merlin CRM v2.0</span>
          </div>
        )}
      </div>

      {/* Messages Log area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                  isUser 
                    ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' 
                    : 'bg-slate-800 border-slate-700 text-teal-400'
                }`}>
                  {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>

                {/* Bubble card */}
                <div className={`rounded-2xl p-3.5 relative group ${
                  isUser 
                    ? 'bg-teal-500/15 border border-teal-500/20 text-slate-100 rounded-tr-none' 
                    : 'bg-slate-900 border border-slate-850 text-slate-100 rounded-tl-none shadow-sm'
                }`}>
                  <div className="prose prose-invert max-w-none text-sm space-y-1">
                    {parseBoldAndFormatting(msg.text)}
                  </div>
                  
                  {/* Message Utility Bar */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/50 text-[10px] text-slate-500">
                    <span>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {!isUser && (
                      <button
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:text-teal-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                        title="Copiar texto limpo"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isTyping && (
          <div className="flex gap-3 mr-auto max-w-[85%]">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-teal-400">
              <Sparkles className="h-4 w-4 animate-spin" />
            </div>
            <div className="bg-slate-900 border border-slate-850 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium animate-pulse">Merlin está analisando seu CRM e redigindo resposta...</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-900 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip.text)}
            disabled={isTyping}
            className="shrink-0 text-left px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-300 hover:text-white rounded-full text-xs font-semibold cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="p-4 bg-slate-900 border-t border-slate-850 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isTyping ? 'Aguarde Merlin responder...' : 'Pergunte sobre clientes, peça scripts de WhatsApp...'}
          disabled={isTyping}
          className="flex-1 bg-slate-950 border border-slate-850 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          className="h-11 w-11 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
