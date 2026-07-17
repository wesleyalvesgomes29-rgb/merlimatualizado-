import React from 'react';
import { Client, Tag, Sale, Task } from '../types';
import { getClientAlerts, isToday } from '../lib/storage';
import { Sparkles } from 'lucide-react';
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
  onNavigateToClientsWithFilter?: (filterType: 'high_priority' | 'no_next_contact') => void;
  onNavigateToTasksWithFilter?: (todayOnly: boolean) => void;
}

export default function MyDay({
  clients,
  tags,
  sales,
  tasks,
  engineResult,
  onSelectClient,
  onQuickContact,
  onQuickReschedule,
  onNavigateToClientsWithFilter,
  onNavigateToTasksWithFilter
}: MyDayProps) {
  // 1. CRM DATA SUMMARIES & FALLBACKS
  const todayClients = clients.filter(c => {
    return isToday(c.nextContactDate) && c.status !== 'Venda Fechada' && c.status !== 'Perdido';
  });

  const overdueClients = clients.filter(c => {
    const alerts = getClientAlerts(c);
    return alerts.isAtrasado;
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
              <div 
                onClick={() => onNavigateToClientsWithFilter?.('high_priority')}
                className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-rose-500/40 hover:bg-slate-900/90 hover:shadow-md hover:scale-[1.01] transition-all duration-200 group cursor-pointer"
              >
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
              <div 
                onClick={() => onNavigateToClientsWithFilter?.('no_next_contact')}
                className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-amber-500/40 hover:bg-slate-900/90 hover:shadow-md hover:scale-[1.01] transition-all duration-200 group cursor-pointer"
              >
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
              <div 
                onClick={() => onNavigateToTasksWithFilter?.(true)}
                className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-teal-500/40 hover:bg-slate-900/90 hover:shadow-md hover:scale-[1.01] transition-all duration-200 group cursor-pointer"
              >
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

    </div>
  );
}
