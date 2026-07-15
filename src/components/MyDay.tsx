import React, { useState } from 'react';
import { Client, Tag, Sale, Task } from '../types';
import { getClientAlerts, isToday, getDaysSinceContact } from '../lib/storage';
import { 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import MerlinChat from './MerlinChat';
import { EngineResult } from '../modules/rulesEngine/types';

interface MyDayProps {
  clients: Client[];
  tags: Tag[];
  sales: Sale[];
  tasks: Task[];
  engineResult?: EngineResult;
  onSelectClient: (id: string) => void;
  onQuickContact: (id: string) => void;
  onQuickReschedule: (id: string, dateStr: string) => void;
}

export default function MyDay({
  clients,
  tags,
  sales,
  tasks,
  engineResult,
  onSelectClient,
  onQuickContact,
  onQuickReschedule
}: MyDayProps) {
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');

  // 1. CRM DATA SUMMARIES & FALLBACKS
  const todayClients = clients.filter(c => {
    return isToday(c.nextContactDate) && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });

  const overdueClients = clients.filter(c => {
    const alerts = getClientAlerts(c);
    return alerts.isAtrasado;
  });

  const retrabalhoClients = clients.filter(c => {
    const alerts = getClientAlerts(c);
    return (alerts.isRetrabalhoSugerido || c.status === 'Retrabalho' || c.tags.includes('Retrabalho')) &&
      c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });

  const newLeads = clients.filter(c => {
    return (c.status === 'Lead Novo' || c.tags.includes('Lead Novo')) &&
      c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });

  // Calculate dynamic stats from Rules Engine or fallback
  const highPriorityCount = engineResult?.priorities?.length ?? clients.filter(c => {
    const alerts = getClientAlerts(c);
    return alerts.isUrgente;
  }).length;

  const noNextContactCount = clients.filter(c => {
    return !c.nextContactDate && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  }).length;

  const todayTasksCount = (engineResult?.todayTasks?.length || 0) + (engineResult?.overdueTasks?.length || 0);
  const finalTasksCount = todayTasksCount > 0 ? todayTasksCount : (todayClients.length + overdueClients.length);

  // 2. PRIORITIZED LIST ALGORITHM
  const getPrioritizedClients = () => {
    const list: { client: Client; reason: string; priorityScore: number; color: string }[] = [];

    // Overdue
    overdueClients.forEach(c => {
      list.push({
        client: c,
        reason: 'Lembrete Atrasado!',
        priorityScore: 10,
        color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
      });
    });

    // Today
    todayClients.forEach(c => {
      if (!list.some(item => item.client.id === c.id)) {
        list.push({
          client: c,
          reason: 'Retorno Agendado para Hoje',
          priorityScore: 8,
          color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
        });
      }
    });

    // New Leads
    newLeads.forEach(c => {
      if (!list.some(item => item.client.id === c.id)) {
        list.push({
          client: c,
          reason: 'Lead Novo pendente de contato',
          priorityScore: 6,
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
        });
      }
    });

    // Retrabalho / Esquecidos
    retrabalhoClients.forEach(c => {
      if (!list.some(item => item.client.id === c.id)) {
        const days = getDaysSinceContact(c);
        list.push({
          client: c,
          reason: `Sem contato há ${days} dias (Sugerido Retrabalho)`,
          priorityScore: 4,
          color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900'
        });
      }
    });

    return list.sort((a, b) => b.priorityScore - a.priorityScore);
  };

  const prioritizedList = getPrioritizedClients();

  const handleRescheduleSubmit = (clientId: string) => {
    if (!rescheduleDate) return;
    onQuickReschedule(clientId, rescheduleDate);
    setReschedulingId(null);
    setRescheduleDate('');
  };

  return (
    <div className="space-y-8" id="my-day-panel">
      
      {/* 1. DUAL-COLUMN MERLIN INTEGRATED COCKPIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -ml-12 -mb-12" />

        {/* Dynamic CRM Analysis Panel (Left) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6 relative z-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-teal-400" />
              <span>Plataforma Merlin CRM &bull; Assistente</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-black text-white font-display leading-tight">
                Bom dia, Wesley 👋
              </h1>
              <p className="text-slate-400 text-xs font-semibold">
                Analisei sua carteira hoje. Você possui:
              </p>
            </div>

            {/* Dynamic Rules Engine stats stacked */}
            <div className="space-y-3 pt-2">
              {/* High Priority */}
              <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-rose-500/20 hover:bg-slate-900 transition-all group">
                <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm">
                  🔥
                </div>
                <div>
                  <span className="text-white font-bold text-sm block">
                    {highPriorityCount} {highPriorityCount === 1 ? 'cliente' : 'clientes'} com alta prioridade
                  </span>
                  <span className="text-[10px] text-slate-500">Atenção imediata para resgatar vendas</span>
                </div>
              </div>

              {/* No scheduled return */}
              <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-amber-500/20 hover:bg-slate-900 transition-all group">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                  ⚠️
                </div>
                <div>
                  <span className="text-white font-bold text-sm block">
                    {noNextContactCount} {noNextContactCount === 1 ? 'cliente' : 'clientes'} sem retorno agendado
                  </span>
                  <span className="text-[10px] text-slate-500">Risco de esfriamento e perda de contato</span>
                </div>
              </div>

              {/* Tasks due today */}
              <div className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-teal-500/20 hover:bg-slate-900 transition-all group">
                <div className="h-9 w-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm">
                  📅
                </div>
                <div>
                  <span className="text-white font-bold text-sm block">
                    {finalTasksCount} {finalTasksCount === 1 ? 'tarefa' : 'tarefas'} para hoje
                  </span>
                  <span className="text-[10px] text-slate-500">Compromissos e agendamentos confirmados</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-500 italic">
              &ldquo;Wesley, vamos bater as metas de hoje? Use o chat ao lado para me pedir ações!&rdquo;
            </p>
            <span className="text-teal-400 font-extrabold text-sm block mt-1.5 animate-pulse">
              Vamos começar? 🚀
            </span>
          </div>
        </div>

        {/* Interactive Merlin Chat Companion (Right) */}
        <div className="lg:col-span-7 relative z-10">
          <MerlinChat 
            clients={clients} 
            tasks={tasks} 
            sales={sales} 
            engineResult={engineResult} 
            compact={true}
            onSelectClient={onSelectClient}
          />
        </div>
      </div>

      {/* 2. PRIORITIZED CONTACTS FEED */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white font-display">
              Contatos Sugeridos por Prioridade
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sua rotina otimizada em tempo real com as melhores recomendações do Merlin
            </p>
          </div>
          
          <div className="flex items-center flex-wrap gap-3 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
            <span className="text-slate-500 font-bold uppercase text-[9px] mr-2">Legenda:</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Atrasados
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Hoje
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Novos
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Sugeridos
            </span>
          </div>
        </div>

        {prioritizedList.length === 0 ? (
          <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
            <p className="font-extrabold text-slate-850 dark:text-slate-200 text-lg">Nenhuma prioridade pendente!</p>
            <p className="text-xs max-w-sm mx-auto mt-2 leading-relaxed">
              Incrível, Wesley! Todos os seus leads estão organizados, sem atrasos e com retornos agendados. Adicione novos clientes para aquecer o funil.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {prioritizedList.map(({ client, reason, color }) => {
              const alerts = getClientAlerts(client);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-5"
                  key={client.id}
                  id={`prioritized-client-${client.id}`}
                >
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${color}`}>
                        {reason}
                      </span>
                      
                      {alerts.isUrgente && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 animate-pulse">
                          URGENTE (Parado &gt; 15 dias)
                        </span>
                      )}
                      
                      {alerts.isSemRetorno && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400">
                          Sem retorno marcado!
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 
                        onClick={() => onSelectClient(client.id)}
                        className="font-black text-xl text-slate-850 dark:text-white hover:text-teal-500 dark:hover:text-teal-400 cursor-pointer transition-colors inline-block"
                      >
                        {client.name}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 dark:text-slate-500">{client.phone}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                        &ldquo;{client.notes || 'Sem observações iniciais.'}&rdquo;
                      </p>
                    </div>

                    {/* Display tags */}
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map(tagName => {
                        const tagColor = tags.find(t => t.name === tagName)?.color || 'bg-slate-100 dark:bg-slate-800 text-slate-850 dark:text-slate-300';
                        return (
                          <span 
                            key={tagName} 
                            className={`text-[10px] px-2.5 py-0.5 rounded-full border ${tagColor}`}
                          >
                            {tagName}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-4 md:pt-0">
                    <button
                      onClick={() => onSelectClient(client.id)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 text-xs font-bold"
                    >
                      <span>Perfil</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="p-3 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Chamar</span>
                    </a>

                    {/* Phone call */}
                    <a
                      href={`tel:${client.phone.replace(/\D/g, '')}`}
                      className="p-3 rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center cursor-pointer"
                    >
                      <Phone className="h-4 w-4" />
                    </a>

                    {/* Register Contact */}
                    <button
                      onClick={() => onQuickContact(client.id)}
                      className="p-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Falei</span>
                      <span className="bg-slate-950/10 px-1.5 py-0.2 rounded text-[10px]">
                        {client.contactCount}
                      </span>
                    </button>

                    {/* Reschedule */}
                    <div className="relative">
                      {reschedulingId === client.id ? (
                        <div className="absolute right-0 bottom-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-2xl z-35 flex flex-col gap-2 w-64">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Próximo Retorno</label>
                          <input
                            type="datetime-local"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            required
                          />
                          <div className="flex gap-2 justify-end mt-2">
                            <button
                              onClick={() => setReschedulingId(null)}
                              className="text-[10px] text-slate-500 font-bold px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleRescheduleSubmit(client.id)}
                              className="text-[10px] bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3 py-1.5 rounded-md"
                            >
                              Agendar
                            </button>
                          </div>
                        </div>
                      ) : null}
                      
                      <button
                        onClick={() => {
                          setReschedulingId(client.id);
                          const d = new Date();
                          d.setHours(d.getHours() + 2);
                          const pad = (n: number) => n.toString().padStart(2, '0');
                          const formatted = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
                          setRescheduleDate(formatted);
                        }}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
