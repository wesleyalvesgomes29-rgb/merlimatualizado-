import React, { useState, useMemo } from 'react';
import { Task, Client } from '../types';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Plus, 
  Calendar, 
  Clock, 
  AlertCircle, 
  User, 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Car, 
  FileText, 
  Users, 
  HelpCircle,
  X,
  PlusCircle,
  ClipboardList,
  Flame,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MyRoutineProps {
  tasks: Task[];
  clients: Client[];
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTaskComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectClient: (clientId: string) => void;
}

const ACTION_TYPES = [
  { label: 'WhatsApp', value: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-500/10' },
  { label: 'Ligação', value: 'Ligação', icon: Phone, color: 'text-blue-500 bg-blue-500/10' },
  { label: 'Visita', value: 'Visita', icon: Car, color: 'text-purple-500 bg-purple-500/10' },
  { label: 'Enviar Proposta', value: 'Enviar Proposta', icon: FileText, color: 'text-amber-500 bg-amber-500/10' },
  { label: 'Reunião', value: 'Reunião', icon: Users, color: 'text-pink-500 bg-pink-500/10' },
  { label: 'Contrato', value: 'Contrato', icon: FileText, color: 'text-indigo-500 bg-indigo-500/10' },
  { label: 'Outro', value: 'Outro', icon: HelpCircle, color: 'text-slate-500 bg-slate-500/10' }
];

export default function MyRoutine({
  tasks,
  clients,
  onAddTask,
  onToggleTaskComplete,
  onDeleteTask,
  onSelectClient
}: MyRoutineProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('pending');

  // Form states
  const [clientId, setClientId] = useState('');
  const [actionType, setActionType] = useState('WhatsApp');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'Alta' | 'Média' | 'Baixa'>('Média');
  const [notes, setNotes] = useState('');

  // Get current local date in YYYY-MM-DD format
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Filter tasks into categories
  const categories = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];

    // Sort tasks chronologically by dueDate and dueTime
    const sortedTasks = [...tasks].sort((a, b) => {
      const dateCompare = a.dueDate.localeCompare(b.dueDate);
      if (dateCompare !== 0) return dateCompare;
      const timeA = a.dueTime || '99:99';
      const timeB = b.dueTime || '99:99';
      return timeA.localeCompare(timeB);
    });

    sortedTasks.forEach(task => {
      // If task is completed, we classify it based on its original date
      if (task.dueDate < todayStr) {
        if (!task.completed) {
          overdue.push(task);
        } else {
          // Completed overdue tasks are shown in today's list or upcoming based on view filter, 
          // let's put completed tasks in their respective date buckets
          overdue.push(task);
        }
      } else if (task.dueDate === todayStr) {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return { overdue, today, upcoming };
  }, [tasks, todayStr]);

  // Handle task submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate) return;

    const linkedClient = clients.find(c => c.id === clientId);

    onAddTask({
      clientId: clientId || undefined,
      clientName: linkedClient ? linkedClient.name : undefined,
      actionType,
      dueDate,
      dueTime: dueTime || undefined,
      priority,
      notes: notes || undefined,
      completed: false
    });

    // Reset form
    setClientId('');
    setActionType('WhatsApp');
    setDueDate('');
    setDueTime('');
    setPriority('Média');
    setNotes('');
    setIsAddingTask(false);
  };

  // Helper for action icon
  const getActionIcon = (type: string) => {
    const action = ACTION_TYPES.find(a => a.value === type);
    if (action) {
      const IconComp = action.icon;
      return <IconComp className="h-4 w-4" />;
    }
    return <HelpCircle className="h-4 w-4" />;
  };

  const getActionColorClass = (type: string) => {
    const action = ACTION_TYPES.find(a => a.value === type);
    return action ? action.color : 'text-slate-500 bg-slate-500/10';
  };

  const getPriorityBadge = (p: 'Alta' | 'Média' | 'Baixa') => {
    switch (p) {
      case 'Alta':
        return <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1"><Flame className="h-3 w-3 animate-pulse" /> Alta</span>;
      case 'Média':
        return <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Média</span>;
      case 'Baixa':
        return <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">Baixa</span>;
    }
  };

  // Filter tasks by active Tab (All, Pending, Completed) for rendering
  const filterList = (list: Task[]) => {
    if (activeTab === 'all') return list;
    if (activeTab === 'pending') return list.filter(t => !t.completed);
    return list.filter(t => t.completed);
  };

  // Render a task list
  const renderTaskList = (list: Task[], title: string, emptyMessage: string, badgeColor: string, showEmptyState: boolean = true) => {
    const filtered = filterList(list);

    if (filtered.length === 0) {
      if (!showEmptyState) return null;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-600">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filtered.map(task => (
          <motion.div
            key={task.id}
            layoutId={task.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className={`group bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 relative overflow-hidden ${
              task.completed 
                ? 'border-slate-100 dark:border-slate-900 opacity-65' 
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {/* Priority line accent */}
            <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
              task.priority === 'Alta' 
                ? 'bg-rose-500' 
                : task.priority === 'Média' 
                  ? 'bg-amber-500' 
                  : 'bg-slate-300 dark:bg-slate-700'
            }`} />

            <div className="flex items-start gap-3 pl-2">
              {/* Checkbox */}
              <button
                onClick={() => onToggleTaskComplete(task.id)}
                className="mt-0.5 text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors cursor-pointer flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-teal-500 dark:text-teal-400" />
                ) : (
                  <Square className="h-5 w-5 text-slate-300 dark:text-slate-700" />
                )}
              </button>

              {/* Core Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Action Badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${getActionColorClass(task.actionType)}`}>
                    {getActionIcon(task.actionType)}
                    <span>{task.actionType}</span>
                  </span>

                  {/* Priority */}
                  {getPriorityBadge(task.priority)}

                  {/* Date & Time */}
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {task.dueDate === todayStr 
                        ? 'Hoje' 
                        : new Date(task.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </span>
                    {task.dueTime && (
                      <>
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{task.dueTime}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Notes/Obs */}
                <p className={`text-sm font-medium text-slate-800 dark:text-slate-100 break-words leading-relaxed ${
                  task.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                }`}>
                  {task.notes || 'Sem observações adicionais.'}
                </p>

                {/* Linked CRM Client */}
                {task.clientId && (
                  <div className="pt-1 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Lead:</span>
                    <button
                      onClick={() => onSelectClient(task.clientId!)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      <User className="h-3 w-3" />
                      <span>{task.clientName || 'Cliente'}</span>
                      <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                )}
              </div>

              {/* Actions (Delete) */}
              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Excluir Tarefa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Quick statistics for summary cards
  const pendingOverdueCount = useMemo(() => categories.overdue.filter(t => !t.completed).length, [categories.overdue]);
  const pendingTodayCount = useMemo(() => categories.today.filter(t => !t.completed).length, [categories.today]);
  const pendingUpcomingCount = useMemo(() => categories.upcoming.filter(t => !t.completed).length, [categories.upcoming]);

  return (
    <div className="space-y-6" id="my-routine-panel">
      {/* Welcome & Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-display">
            Minha Rotina
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie e execute suas tarefas comerciais integradas aos leads do CRM.
          </p>
        </div>

        <button
          onClick={() => setIsAddingTask(true)}
          className="inline-flex items-center justify-center gap-2 bg-teal-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-md shadow-teal-500/10 hover:bg-teal-400 hover:shadow-teal-500/20 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          <span>Nova Tarefa</span>
        </button>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overdue Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Atrasadas</span>
            <div className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">
              {pendingOverdueCount}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${
            pendingOverdueCount > 0 ? 'bg-rose-500/10 text-rose-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Today Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">De Hoje</span>
            <div className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">
              {pendingTodayCount}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${
            pendingTodayCount > 0 ? 'bg-teal-500/10 text-teal-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {/* Upcoming Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Próximas</span>
            <div className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">
              {pendingUpcomingCount}
            </div>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* View Filter tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Pendentes
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Concluídas
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Todas
        </button>
      </div>

      {/* Main Routine Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Atrasadas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className={`h-4.5 w-4.5 ${categories.overdue.length > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Tarefas Atrasadas
            </h2>
            <span className="text-[10px] bg-rose-500/15 text-rose-500 dark:text-rose-400 font-extrabold px-1.5 py-0.2 rounded-full font-mono">
              {filterList(categories.overdue).length}
            </span>
          </div>
          {renderTaskList(
            categories.overdue, 
            'Atrasadas', 
            'Excelente! Nenhuma tarefa atrasada por aqui.', 
            'rose'
          )}
        </div>

        {/* Column 2: Hoje */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4.5 w-4.5 text-teal-500" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Tarefas de Hoje
            </h2>
            <span className="text-[10px] bg-teal-500/15 text-teal-500 dark:text-teal-400 font-extrabold px-1.5 py-0.2 rounded-full font-mono">
              {filterList(categories.today).length}
            </span>
          </div>
          {renderTaskList(
            categories.today, 
            'Hoje', 
            'Tudo limpo por hoje! Aproveite para cadastrar novos leads.', 
            'teal'
          )}
        </div>

        {/* Column 3: Próximas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="h-4.5 w-4.5 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Próximas Tarefas
            </h2>
            <span className="text-[10px] bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 font-extrabold px-1.5 py-0.2 rounded-full font-mono">
              {filterList(categories.upcoming).length}
            </span>
          </div>
          {renderTaskList(
            categories.upcoming, 
            'Próximas', 
            'Nenhuma tarefa futura agendada no momento.', 
            'indigo'
          )}
        </div>
      </div>

      {/* Task Creation Modal */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-500/10 text-teal-500 rounded-lg">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      Nova Tarefa Comercial
                    </h3>
                    <p className="text-[11px] text-slate-400">Agende ações de follow-up com seus leads.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddingTask(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Linked CRM Client */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Vincular a um Lead (CRM)
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- Sem vínculo (Tarefa geral) --</option>
                    {clients
                      .filter(c => c.status !== 'Venda Fechada' && c.status !== 'Perdido')
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.status})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Grid row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Action type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Tipo de Ação
                    </label>
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 dark:text-slate-100"
                    >
                      {ACTION_TYPES.map(action => (
                        <option key={action.value} value={action.value}>
                          {action.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Prioridade
                    </label>
                    <div className="flex gap-2 h-[38px]">
                      {(['Baixa', 'Média', 'Alta'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            priority === p
                              ? p === 'Alta'
                                ? 'bg-rose-500/10 border-rose-500 text-rose-500'
                                : p === 'Média'
                                  ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                  : 'bg-slate-100 border-slate-400 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                              : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Data Limite *
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Due Time */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Horário (Opcional)
                    </label>
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Observação / Detalhes *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ex: Ligar para agendar visita no decorado do Villa-Lobos Residencial"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none text-slate-800 dark:text-slate-100 leading-relaxed"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-slate-200 px-4 py-2 text-xs font-bold cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-teal-500 text-slate-950 font-bold hover:bg-teal-400 rounded-xl px-5 py-2 text-xs cursor-pointer shadow-md shadow-teal-500/10 transition-all"
                  >
                    Criar Tarefa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
