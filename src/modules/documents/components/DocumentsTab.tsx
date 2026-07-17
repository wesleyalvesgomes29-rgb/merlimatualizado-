import React, { useState, useEffect } from 'react';
import { ClientDocument, DocumentStatus } from '../types';
import { documentService } from '../services';
import { 
  FileText, 
  Eye, 
  Trash2, 
  ExternalLink, 
  Paperclip, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  User, 
  Calendar,
  X,
  FileCheck
} from 'lucide-react';

interface DocumentsTabProps {
  clientId: string;
}

export default function DocumentsTab({ clientId }: DocumentsTabProps) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [activePreviewDoc, setActivePreviewDoc] = useState<ClientDocument | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<ClientDocument | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load documents for client
  const loadDocs = () => {
    const docs = documentService.getClientDocuments(clientId);
    setDocuments(docs);
  };

  useEffect(() => {
    loadDocs();
  }, [clientId]);

  // Stat calculation
  const totalDocsCount = documents.length; // Will be 10
  const receivedDocs = documents.filter(d => d.status === 'Recebido');
  const receivedCount = receivedDocs.length;
  
  // Missing list to display in the alert banner
  const missingDocs = documents.filter(d => d.status === 'Faltando' || d.status === 'Pendente');

  // Convert File to Base64
  const handleFileUpload = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: PDF, JPG, PNG
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato de arquivo inválido. Apenas PDF, JPG e PNG são permitidos.');
      return;
    }

    // Limit size to 10MB to be safe for localstorage
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('O tamanho do arquivo excede o limite de 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const updatedDocs = documentService.uploadDocument(
        clientId,
        docType,
        file.name,
        file.type,
        base64Data
      );
      setDocuments(updatedDocs);
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (doc: ClientDocument) => {
    const updatedDocs = documentService.deleteDocument(clientId, doc.documentType);
    setDocuments(updatedDocs);
    setDeleteConfirmDoc(null);
  };

  const handleStatusChange = (docType: string, status: DocumentStatus) => {
    const updatedDocs = documentService.updateDocumentStatus(clientId, docType, status);
    setDocuments(updatedDocs);
  };

  const handleOpenDocument = (doc: ClientDocument) => {
    if (!doc.fileData) return;
    try {
      // Direct opening in window or download fallback
      const newWin = window.open();
      if (newWin) {
        newWin.document.write(
          `<iframe src="${doc.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
        newWin.document.title = doc.fileName || doc.documentType;
      } else {
        // Fallback: download
        const a = document.createElement('a');
        a.href = doc.fileData;
        a.download = doc.fileName || `${doc.documentType}.bin`;
        a.click();
      }
    } catch (e) {
      // Direct download if window open fails
      const a = document.createElement('a');
      a.href = doc.fileData;
      a.download = doc.fileName || `${doc.documentType}.bin`;
      a.click();
    }
  };

  return (
    <div className="space-y-6" id="documents-tab-container">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-teal-500" />
            Documentos do Cliente
          </h3>
          <p className="text-xs text-slate-500">Mantenha a papelada e análise do cliente centralizada</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl font-bold border border-slate-200 dark:border-slate-700">
            Completo: <span className="text-teal-600 dark:text-teal-400 font-extrabold">{receivedCount} de {totalDocsCount}</span>
          </div>
        </div>
      </div>

      {/* Error message banner */}
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto font-bold text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* 2. DYNAMIC SUMMARY PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Progress Bar Column */}
        <div className="md:col-span-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex flex-col justify-center space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Progresso da Pasta</span>
            <span className="font-extrabold text-teal-500">{Math.round((receivedCount / totalDocsCount) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(receivedCount / totalDocsCount) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Envie todos os 10 documentos obrigatórios para obter 100% de conformidade de análise de crédito.
          </p>
        </div>

        {/* Missing List Banner Column */}
        <div className="md:col-span-7 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-2xl p-4 space-y-2">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            Documentos Pendentes ou Faltantes
          </span>
          {missingDocs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-300 font-semibold">
              ✨ Sensacional! Todos os documentos foram recebidos e estão na pasta do cliente.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {missingDocs.map(doc => (
                <span 
                  key={doc.documentType} 
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    doc.status === 'Pendente'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}
                >
                  {doc.documentType} ({doc.status})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. DOCUMENT LISTING TABLE / GRID */}
      <div className="border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden shadow-xs">
        <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border-b border-slate-100 dark:border-slate-850 grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-slate-400">
          <div className="col-span-5 md:col-span-4">Nome do Documento</div>
          <div className="col-span-3 md:col-span-2 text-center">Status</div>
          <div className="hidden md:block md:col-span-3">Detalhes do Envio</div>
          <div className="col-span-4 md:col-span-3 text-right">Ações</div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-850 bg-white dark:bg-slate-900">
          {documents.map((doc) => {
            const isReceived = doc.status === 'Recebido';
            const isPending = doc.status === 'Pendente';
            const isMissing = doc.status === 'Faltando';

            return (
              <div 
                key={doc.documentType} 
                className="px-4 py-3.5 grid grid-cols-12 items-center gap-2 hover:bg-slate-50/55 dark:hover:bg-slate-950/20 transition-all"
              >
                {/* Name / Type */}
                <div className="col-span-5 md:col-span-4 flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg border ${
                    isReceived
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isPending
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate" title={doc.documentType}>
                      {doc.documentType}
                    </span>
                    {doc.fileName && (
                      <span className="text-[10px] text-slate-400 block max-w-[150px] truncate" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator & Change Dropdown */}
                <div className="col-span-3 md:col-span-2 flex justify-center">
                  <select
                    value={doc.status}
                    onChange={(e) => handleStatusChange(doc.documentType, e.target.value as DocumentStatus)}
                    className={`text-[10px] font-bold rounded-lg px-2 py-1 border focus:outline-hidden cursor-pointer ${
                      isReceived
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : isPending
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <option value="Recebido" disabled={!isReceived}>✅ Recebido</option>
                    <option value="Pendente">⏳ Pendente</option>
                    <option value="Faltando">❌ Faltando</option>
                  </select>
                </div>

                {/* Upload Details */}
                <div className="hidden md:flex md:col-span-3 flex-col text-[10px] text-slate-500 space-y-0.5">
                  {isReceived ? (
                    <>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{new Date(doc.uploadedAt!).toLocaleDateString('pt-BR')} às {new Date(doc.uploadedAt!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>{doc.uploadedBy}</span>
                      </div>
                    </>
                  ) : (
                    <span className="italic text-slate-400">Aguardando arquivo</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="col-span-4 md:col-span-3 flex items-center justify-end gap-1">
                  {isReceived ? (
                    <>
                      {/* View Button */}
                      <button
                        onClick={() => setActivePreviewDoc(doc)}
                        className="p-1.5 text-slate-500 hover:text-teal-500 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Visualizar documento"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Open / Download Button */}
                      <button
                        onClick={() => handleOpenDocument(doc)}
                        className="p-1.5 text-slate-500 hover:text-teal-500 dark:text-slate-400 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Abrir / Baixar documento"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteConfirmDoc(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Excluir documento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Attachment Selector Button */}
                      <label 
                        className="flex items-center gap-1 bg-slate-100 hover:bg-teal-500 text-slate-600 hover:text-white dark:bg-slate-800 dark:hover:bg-teal-500 dark:text-slate-300 dark:hover:text-slate-950 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border border-slate-200 dark:border-slate-700 hover:border-transparent shadow-2xs"
                        title="Fazer upload de PDF, JPG ou PNG"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span>Anexar</span>
                        <input 
                          type="file" 
                          accept=".pdf, .jpg, .jpeg, .png, image/png, image/jpeg, application/pdf"
                          onChange={(e) => handleFileUpload(doc.documentType, e)}
                          className="hidden" 
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. EXPLICIT LIGHTBOX / PREVIEW MODAL */}
      {activePreviewDoc && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm">
                  Visualizar: {activePreviewDoc.documentType}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[250px]" title={activePreviewDoc.fileName}>
                  {activePreviewDoc.fileName}
                </p>
              </div>
              <button 
                onClick={() => setActivePreviewDoc(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body / Viewer */}
            <div className="p-4 flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[500px] overflow-auto">
              {activePreviewDoc.fileType?.startsWith('image/') ? (
                <img 
                  src={activePreviewDoc.fileData} 
                  alt={activePreviewDoc.documentType} 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-full object-contain rounded-lg border border-slate-200 shadow-sm"
                />
              ) : activePreviewDoc.fileType === 'application/pdf' ? (
                /* PDF Visualizer Card with Open buttons as sandbox iframe can block embed/rendering */
                <div className="text-center p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm shadow-md">
                  <div className="p-4 bg-teal-500/10 text-teal-500 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">Arquivo PDF de Análise</h5>
                  <p className="text-[10px] text-slate-400 mb-4 truncate">{activePreviewDoc.fileName}</p>
                  <button
                    onClick={() => {
                      handleOpenDocument(activePreviewDoc);
                      setActivePreviewDoc(null);
                    }}
                    className="w-full bg-teal-500 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg hover:bg-teal-600 flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Abrir PDF em Nova Aba</span>
                  </button>
                </div>
              ) : (
                <span className="text-slate-400 text-xs">Formato desconhecido</span>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-850 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleOpenDocument(activePreviewDoc);
                  setActivePreviewDoc(null);
                }}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Abrir Externo
              </button>
              <button
                onClick={() => setActivePreviewDoc(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE DIALOG MODAL */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm">Excluir Documento?</h4>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              Tem certeza de que deseja remover o arquivo <strong className="text-slate-700 dark:text-slate-200 font-bold">{deleteConfirmDoc.fileName}</strong> do documento <strong className="text-slate-700 dark:text-slate-200 font-bold">{deleteConfirmDoc.documentType}</strong>? O status do documento retornará para "Faltando".
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmDoc)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
