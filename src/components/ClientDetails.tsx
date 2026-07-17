import React, { useState, useEffect } from 'react';
import { Client, Tag, ClientStatus, CommentEntry, Task } from '../types';
import { getClientAlerts, getDaysSinceContact, getStoredTasks, saveStoredTasks } from '../lib/storage';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  Tag as TagIcon, 
  Check, 
  Plus, 
  History, 
  RotateCw, 
  AlertTriangle,
  ChevronDown,
  FileText,
  Save,
  MessageCircle,
  TrendingUp,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import DocumentsTab from '../modules/documents/components/DocumentsTab';

interface ClientDetailsProps {
  client: Client;
  tags: Tag[];
  onClose: () => void;
  onUpdateClient: (updated: Client) => void;
  tasks?: Task[];
  onAddTask?: (taskData: Omit<Task, 'id' | 'createdAt'>) => void;
  onToggleTaskComplete?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function ClientDetails({
  client,
  tags,
  onClose,
  onUpdateClient,
  tasks: tasksProp,
  onAddTask,
  onToggleTaskComplete,
  onDeleteTask
}: ClientDetailsProps) {
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [notes, setNotes] = useState(client.notes);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [nextContactDate, setNextContactDate] = useState(client.nextContactDate || '');
  const [contactCount, setContactCount] = useState(client.contactCount);
  const [selectedTags, setSelectedTags] = useState<string[]>(client.tags);
  const [newComment, setNewComment] = useState('');
  const [email, setEmail] = useState(client.email || '');
  const [empreendimento, setEmpreendimento] = useState(client.empreendimento || '');
  const [origem, setOrigem] = useState(client.origem || '');

  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'informacoes' | 'historico' | 'atendimentos' | 'agenda' | 'documentos'>('informacoes');

  // Agenda sub-tab states
  const [clientTasks, setClientTasks] = useState<Task[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskActionType, setTaskActionType] = useState('WhatsApp');
  const [taskPriority, setTaskPriority] = useState<'Alta' | 'Média' | 'Baixa'>('Média');
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskNotes, setTaskNotes] = useState('');

  // Sync client tasks reactively
  useEffect(() => {
    if (tasksProp) {
      setClientTasks(tasksProp.filter(t => t.clientId === client.id));
    } else {
      const allTasks = getStoredTasks();
      setClientTasks(allTasks.filter(t => t.clientId === client.id));
    }
  }, [client.id, tasksProp]);

  // Form submit handler for new tasks
  const handleFormAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDueDate) return;

    const taskData = {
      clientId: client.id,
      clientName: client.name,
      actionType: taskActionType,
      dueDate: taskDueDate,
      dueTime: taskDueTime || undefined,
      priority: taskPriority,
      notes: taskNotes || undefined,
      completed: false
    };

    if (onAddTask) {
      onAddTask(taskData);
    } else {
      // Fallback direct storage update
      const allTasks = getStoredTasks();
      const newTask: Task = {
        id: 'task_' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        ...taskData
      };
      const updated = [newTask, ...allTasks];
      saveStoredTasks(updated);
      setClientTasks(updated.filter(t => t.clientId === client.id));
    }

    // Reset task form
    setIsAddingTask(false);
    setTaskNotes('');
  };

  const alerts = getClientAlerts(client);
  const days = getDaysSinceContact(client);

  const handleToggleTag = (tagName: string) => {
    let updated: string[];
    if (selectedTags.includes(tagName)) {
      updated = selectedTags.filter(t => t !== tagName);
    } else {
      updated = [...selectedTags, tagName];
    }
    setSelectedTags(updated);
    
    // Auto-save tag change
    const updatedClient: Client = {
      ...client,
      tags: updated,
      history: [
        {
          id: Math.random().toString(),
          date: new Date().toISOString(),
          action: `Etiquetas atualizadas: ${updated.join(', ') || 'Nenhuma'}`
        },
        ...client.history
      ]
    };
    onUpdateClient(updatedClient);
  };

  const handleIncrementContact = () => {
    const newVal = contactCount + 1;
    setContactCount(newVal);
    
    const updatedClient: Client = {
      ...client,
      contactCount: newVal,
      lastContactDate: new Date().toISOString(),
      history: [
        {
          id: Math.random().toString(),
          date: new Date().toISOString(),
          action: `Contato registrado (Total de interações: ${newVal})`
        },
        ...client.history
      ]
    };
    onUpdateClient(updatedClient);
  };

  const handleDecrementContact = () => {
    if (contactCount === 0) return;
    const newVal = contactCount - 1;
    setContactCount(newVal);
    
    const updatedClient: Client = {
      ...client,
      contactCount: newVal,
      history: [
        {
          id: Math.random().toString(),
          date: new Date().toISOString(),
          action: `Contador de contatos reduzido manualmente para ${newVal}`
        },
        ...client.history
      ]
    };
    onUpdateClient(updatedClient);
  };

  const handleSaveGeneral = () => {
    if (!name.trim()) return;

    const historyItems = [];
    if (name !== client.name) historyItems.push(`Alterou o nome de "${client.name}" para "${name}"`);
    if (phone !== client.phone) historyItems.push(`Alterou o telefone para "${phone}"`);
    if (notes !== client.notes) historyItems.push(`Atualizou as observações iniciais`);
    if (status !== client.status) historyItems.push(`Moveu a etapa de "${client.status}" para "${status}"`);
    if (nextContactDate !== (client.nextContactDate || '')) {
      historyItems.push(
        nextContactDate 
          ? `Agendou próximo retorno para ${new Date(nextContactDate).toLocaleString('pt-BR')}`
          : 'Removeu data de próximo retorno'
      );
    }
    if (email !== (client.email || '')) historyItems.push(`Alterou o email para "${email}"`);
    if (empreendimento !== (client.empreendimento || '')) historyItems.push(`Alterou o empreendimento de interesse para "${empreendimento}"`);
    if (origem !== (client.origem || '')) historyItems.push(`Alterou a origem do lead para "${origem}"`);

    const newHistory = historyItems.map(item => ({
      id: Math.random().toString(),
      date: new Date().toISOString(),
      action: item
    }));

    const updatedClient: Client = {
      ...client,
      name,
      phone,
      notes,
      status,
      nextContactDate: nextContactDate || null,
      email: email.trim() || undefined,
      empreendimento: empreendimento.trim() || undefined,
      origem: origem.trim() || undefined,
      history: [...newHistory, ...client.history]
    };

    onUpdateClient(updatedClient);
    setIsEditingGeneral(false);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newCommentObj: CommentEntry = {
      id: Math.random().toString(),
      date: new Date().toISOString(),
      text: newComment.trim()
    };

    const updatedClient: Client = {
      ...client,
      comments: [newCommentObj, ...client.comments],
      lastContactDate: new Date().toISOString(), // Auto updates last contact on comment log
      history: [
        {
          id: Math.random().toString(),
          date: new Date().toISOString(),
          action: `Novo comentário registrado no histórico de observações`
        },
        ...client.history
      ]
    };

    onUpdateClient(updatedClient);
    setNewComment('');
  };

  const STATUS_LIST: ClientStatus[] = [
    'Lead Novo',
    'Contato',
    'Em Atendimento',
    'Retrabalho',
    'Agendado',
    'Visitou',
    'Proposta',
    'Documentação',
    'Venda Fechada',
    'Perdido'
  ];

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-all"
      onClick={onClose}
      id="client-profile-modal-backdrop"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl relative border-l border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
        id="client-profile-modal-body"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Ficha de Atendimento</h2>
              <p className="text-xs text-slate-500">Perfil, lembretes e linha do tempo do cliente</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            id="close-profile-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="px-5 border-b border-slate-150 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 flex gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('informacoes')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'informacoes'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Informações</span>
          </button>
          <button
            onClick={() => setActiveSubTab('historico')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'historico'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Histórico</span>
          </button>
          <button
            onClick={() => setActiveSubTab('atendimentos')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'atendimentos'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Atendimentos</span>
          </button>
          <button
            onClick={() => setActiveSubTab('agenda')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'agenda'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Agenda</span>
          </button>
          <button
            onClick={() => setActiveSubTab('documentos')}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all relative border-b-2 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'documentos'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5 text-teal-500" />
            <span>📂 Documentos</span>
          </button>
        </div>

        {/* Content Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Intelligence Alerts Banner */}
          {(alerts.isAtrasado || alerts.isUrgente || alerts.isSemRetorno) && (
            <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-xl p-4 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Dica de Inteligência Merlin
              </span>
              <ul className="text-xs text-slate-700 dark:text-slate-300 list-disc list-inside space-y-1 pt-1">
                {alerts.isAtrasado && (
                  <li>O retorno deste cliente está <strong>atrasado</strong>. Entre em contato urgente.</li>
                )}
                {alerts.isUrgente && (
                  <li><strong>Alerta Urgente</strong>: Sem contato há {days} dias (&gt; 15 dias parado). Recomenda-se resgatar ou descartar.</li>
                )}
                {alerts.isSemRetorno && (
                  <li>Este cliente não possui um <strong>próximo contato agendado</strong>. Defina uma data de retorno para não esquecê-lo!</li>
                )}
              </ul>
            </div>
          )}

          {/* TAB 1: INFORMAÇÕES */}
          {activeSubTab === 'informacoes' && (
            <div className="space-y-8">
              {/* SECTION 1: GENERAL INFO (EDITABLE OR STATIC) */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dados do Cliente</h3>
                  <button
                    onClick={() => {
                      if (isEditingGeneral) {
                        handleSaveGeneral();
                      } else {
                        setIsEditingGeneral(true);
                      }
                    }}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    {isEditingGeneral ? (
                      <>
                        <Save className="h-3.5 w-3.5" />
                        <span>Salvar Dados</span>
                      </>
                    ) : (
                      <span>Editar Informações</span>
                    )}
                  </button>
                </div>

                {isEditingGeneral ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nome Completo</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone / WhatsApp</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ex: (11) 98765-4321"
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Ex: roberto@gmail.com"
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Empreendimento de Interesse</label>
                        <input
                          type="text"
                          value={empreendimento}
                          onChange={(e) => setEmpreendimento(e.target.value)}
                          placeholder="Ex: Residencial Bela Vista"
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Etapa do Funil</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as ClientStatus)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                        >
                          {STATUS_LIST.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Origem do Lead</label>
                        <input
                          type="text"
                          value={origem}
                          onChange={(e) => setOrigem(e.target.value)}
                          placeholder="Ex: Instagram, Placa"
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Próximo Retorno (Agendamento)</label>
                        <input
                          type="datetime-local"
                          value={nextContactDate}
                          onChange={(e) => setNextContactDate(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Observações Iniciais</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Descrição do perfil imobiliário..."
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                ) : (
                  // STATIC DISPLAY
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{client.name}</h1>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-mono text-slate-500 font-semibold">{client.phone}</p>
                          
                          <div className="flex gap-1.5">
                            <a
                              href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              referrerPolicy="no-referrer"
                              className="p-1.5 bg-green-500 text-white hover:bg-green-600 rounded-lg transition-colors flex items-center justify-center shadow-xs"
                              title="WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={`tel:${client.phone.replace(/\D/g, '')}`}
                              className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 rounded-lg transition-colors flex items-center justify-center"
                              title="Ligar"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col md:items-end justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Etapa do Funil</span>
                        <span className="text-sm font-bold bg-teal-500 text-white px-3 py-1 rounded-full mt-1 inline-block">
                          {client.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-150 dark:border-slate-800/80 pt-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Próximo Retorno</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                            {client.nextContactDate 
                              ? new Date(client.nextContactDate).toLocaleString('pt-BR') 
                              : 'Sem retorno agendado'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Período Sem Conversa</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                            {days} dia{days > 1 ? 's' : ''} sem toque de relacionamento
                          </span>
                        </div>
                      </div>
                    </div>

                    {(client.email || client.empreendimento || client.origem) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-150 dark:border-slate-800/80 pt-4">
                        {client.email && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Email</span>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1 truncate" title={client.email}>
                              {client.email}
                            </p>
                          </div>
                        )}
                        {client.empreendimento && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Empreendimento</span>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1">
                              {client.empreendimento}
                            </p>
                          </div>
                        )}
                        {client.origem && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Origem</span>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1">
                              {client.origem}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {client.notes && (
                      <div className="border-t border-slate-150 dark:border-slate-800/80 pt-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Perfil Imobiliário</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 italic">
                          &ldquo;{client.notes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION 2: WHATSAPP-STYLE TAGS */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Etiquetas Associadas</h3>
                  <p className="text-[10px] text-slate-400">Clique nas etiquetas abaixo para ativá-las ou desativá-las</p>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  {tags.map(tag => {
                    const isActive = selectedTags.includes(tag.name);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.name)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                          isActive 
                            ? `${tag.color} ring-2 ring-teal-500/20` 
                            : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span>{tag.name}</span>
                        {isActive && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: RE-TRABALHO (FOLLOW-UP COUNTER) */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Controle de Retrabalho (Seguimento)</span>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Quantas vezes você conversou com este cliente?</h4>
                  <p className="text-xs text-slate-500">Última conversa registrada: {client.lastContactDate ? new Date(client.lastContactDate).toLocaleDateString('pt-BR') : 'Nenhuma'}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDecrementContact}
                    disabled={contactCount === 0}
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="font-mono text-2xl font-black text-slate-800 dark:text-slate-100 w-12 text-center">
                    {contactCount}
                  </span>
                  <button
                    onClick={handleIncrementContact}
                    className="w-8 h-8 rounded-lg bg-teal-500 text-white flex items-center justify-center font-bold hover:bg-teal-600 cursor-pointer shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTÓRICO */}
          {activeSubTab === 'historico' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Linha do Tempo de Alterações</h3>
              </div>

              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2.5 space-y-4">
                {client.history.map(hist => (
                  <div key={hist.id} className="relative">
                    {/* Timeline dot */}
                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-slate-900" />
                    
                    <div className="text-[10px] text-slate-400">
                      {new Date(hist.date).toLocaleString('pt-BR')}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                      {hist.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ATENDIMENTOS */}
          {activeSubTab === 'atendimentos' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Histórico de Conversas</h3>
                <p className="text-[10px] text-slate-400">Cadastre notas sobre telefonemas, visitas ou reuniões com este cliente</p>
              </div>

              {/* Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Liguei hoje e ele quer visitar o imóvel no próximo sábado..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Salvar Nota</span>
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-3">
                {client.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50/50 dark:bg-slate-950/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhuma anotação de conversa cadastrada ainda.
                  </p>
                ) : (
                  client.comments.map(comm => (
                    <div 
                      key={comm.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          Contato Registrado
                        </span>
                        <span>{new Date(comm.date).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {comm.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AGENDA */}
          {activeSubTab === 'agenda' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-teal-500" />
                    Agenda & Compromissos
                  </h3>
                  <p className="text-xs text-slate-500">Próximas ações e compromissos agendados para este cliente</p>
                </div>
                
                <button
                  onClick={() => setIsAddingTask(!isAddingTask)}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isAddingTask ? 'Fechar Formulário' : 'Novo Compromisso'}</span>
                </button>
              </div>

              {/* Add task form */}
              {isAddingTask && (
                <form onSubmit={handleFormAddTask} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Novo Agendamento</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Ação / Tipo</label>
                      <select
                        value={taskActionType}
                        onChange={(e) => setTaskActionType(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Ligação">Ligação</option>
                        <option value="Visita">Visita</option>
                        <option value="Enviar Proposta">Enviar Proposta</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Prioridade</label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as 'Alta' | 'Média' | 'Baixa')}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                      >
                        <option value="Alta">Alta 🔥</option>
                        <option value="Média">Média ⚡</option>
                        <option value="Baixa">Baixa 💤</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                      <input
                        type="date"
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Hora</label>
                      <input
                        type="time"
                        value={taskDueTime}
                        onChange={(e) => setTaskDueTime(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Observações</label>
                    <input
                      type="text"
                      placeholder="Ex: Apresentar proposta do Residencial Bela Vista"
                      value={taskNotes}
                      onChange={(e) => setTaskNotes(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agendar Compromisso</span>
                  </button>
                </form>
              )}

              {/* Task List */}
              <div className="space-y-3">
                {clientTasks.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center space-y-2">
                    <Calendar className="h-8 w-8 text-slate-400" />
                    <p className="text-xs text-slate-500">Nenhum compromisso agendado para este cliente.</p>
                    {!isAddingTask && (
                      <button
                        onClick={() => setIsAddingTask(true)}
                        className="mt-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        Criar Primeiro Agendamento
                      </button>
                    )}
                  </div>
                ) : (
                  clientTasks.map(t => (
                    <div 
                      key={t.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-2xs transition-all ${
                        t.completed 
                          ? 'bg-slate-50/70 dark:bg-slate-950/25 border-slate-100 dark:border-slate-850 opacity-60' 
                          : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => onToggleTaskComplete?.(t.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                            t.completed 
                              ? 'bg-teal-500 border-teal-500 text-slate-950' 
                              : 'border-slate-300 dark:border-slate-700 hover:border-teal-500'
                          }`}
                        >
                          {t.completed && <Check className="h-3.5 w-3.5 font-bold text-slate-950" />}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${t.completed ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                              {t.actionType}
                            </span>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                              t.priority === 'Alta' 
                                ? 'bg-rose-500/15 text-rose-500' 
                                : t.priority === 'Média' 
                                ? 'bg-amber-500/15 text-amber-500' 
                                : 'bg-slate-500/15 text-slate-500'
                            }`}>
                              {t.priority}
                            </span>
                          </div>
                          {t.notes && (
                            <p className={`text-[11px] mt-0.5 ${t.completed ? 'line-through text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              {t.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-400">
                            <span className="font-semibold flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {new Date(t.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')} {t.dueTime ? `@ ${t.dueTime}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteTask?.(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Excluir agendamento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DOCUMENTOS */}
          {activeSubTab === 'documentos' && (
            <DocumentsTab clientId={client.id} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
