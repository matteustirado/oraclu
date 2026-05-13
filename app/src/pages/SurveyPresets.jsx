import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Rocket, Trash2, FileText, Calendar, CheckCircle2, Loader2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../services/api'

// --- COMPONENTE ISOLADO DO CARD ---
function PresetCard({ preset, isActive, actionLoadingId, onActivate, onDeleteRequest, formatDate }) {
  const [previewPageIdx, setPreviewPageIdx] = useState(0)
  
  const pages = preset.pages || []
  const activePreviewPage = pages[previewPageIdx] || { questions: [] }
  const totalQuestions = pages.reduce((acc, page) => acc + page.questions.length, 0)

  const handlePrevPreview = () => setPreviewPageIdx(p => Math.max(p - 1, 0))
  const handleNextPreview = () => setPreviewPageIdx(p => Math.min(p + 1, pages.length - 1))

  const getTypeLabel = (type) => {
    switch(type) {
      case 'SCALE_10': return 'Escala 0 a 10'
      case 'YES_NO': return 'Sim ou Não'
      case 'THIS_THAT': return 'Esse ou Aquele (Imagens)'
      case 'EMOJI_SCALE': return 'Emojis'
      default: return type
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-black/40 p-4 transition-all h-full ${
        isActive 
          ? 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {isActive && (
        <div className="absolute right-0 top-0 flex items-center justify-center rounded-bl-2xl bg-purple-500 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white shadow-lg z-10">
          <CheckCircle2 size={10} className="mr-1" strokeWidth={3} /> Ativo Agora
        </div>
      )}

      {/* Título e Metadados base */}
      <div className="mb-3 shrink-0">
        <h3 className="mb-1 truncate pr-20 text-lg font-black text-white" title={preset.title}>
          {preset.title}
        </h3>
        <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest text-white/40">
          <span className="flex items-center gap-1">
            <FileText size={10} /> {pages.length} {pages.length === 1 ? 'Pág.' : 'Págs.'}
          </span>
          <span className="flex items-center gap-1">
            • {totalQuestions} {totalQuestions === 1 ? 'Pergunta' : 'Perguntas'}
          </span>
        </div>
      </div>

      {/* CAIXA DE PRÉVIA DA PESQUISA */}
      <div className="flex-1 flex flex-col bg-black/30 border border-white/5 rounded-xl p-3 mb-4 min-h-[140px]">
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {activePreviewPage.questions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[9px] font-bold text-white/20 uppercase tracking-widest">
              Página Vazia
            </div>
          ) : (
            activePreviewPage.questions.map((q, idx) => (
              <div key={q.id || idx} className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-white/90 line-clamp-2 leading-snug">
                  {q.text || <span className="text-white/30 italic">Pergunta sem texto...</span>}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-fuchsia-400">
                  {getTypeLabel(q.type)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Controles de Paginação da Prévia */}
        {pages.length > 1 && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10 shrink-0">
            <button 
              onClick={handlePrevPreview} 
              disabled={previewPageIdx === 0}
              className="p-1 rounded-md text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">
              Página {previewPageIdx + 1} / {pages.length}
            </span>
            <button 
              onClick={handleNextPreview} 
              disabled={previewPageIdx === pages.length - 1}
              className="p-1 rounded-md text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Data e Ações */}
      <div className="mt-auto shrink-0">
        <div className="mb-4 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/30 border-b border-white/5 pb-4">
          <Calendar size={12} /> Criado em: {formatDate(preset.created_at)}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onActivate(preset.id)}
            disabled={isActive || actionLoadingId === preset.id}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              isActive
                ? 'bg-purple-500/10 text-purple-400 opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:brightness-110 active:scale-95'
            }`}
          >
            {actionLoadingId === preset.id && !isActive ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isActive ? (
              'Ativado'
            ) : (
              <>
                <Rocket size={14} /> Ativar
              </>
            )}
          </button>

          <button
            onClick={() => onDeleteRequest(preset)}
            disabled={actionLoadingId === preset.id}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
            title="Excluir Modelo"
          >
            {actionLoadingId === preset.id ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
// -------------------------------------------------------------------------


export default function SurveyPresets() {
  const navigate = useNavigate()
  
  const [presets, setPresets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  
  // Controle do Modal de Exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const userStr = localStorage.getItem('oraclu_user')
  const user = userStr ? JSON.parse(userStr) : { unit: 'SP', role: 'admin' }
  const currentUnit = user.unit || 'SP'
  const userRole = user.role || ''

  // Apenas Super e Admin Master podem ver o botão voltar
  const canGoBackToEditor = ['super', 'admin'].includes(userRole)

  const fetchPresets = useCallback(async () => {
    try {
      const res = await api.get(`/api/survey/presets/${currentUnit}`)
      setPresets(res.data)
    } catch (error) {
      toast.error('Erro ao carregar os modelos salvos.')
    } finally {
      setIsLoading(false)
    }
  }, [currentUnit])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  const handleActivate = async (presetId) => {
    setActionLoadingId(presetId)
    try {
      await api.post('/api/survey/active', { unit: currentUnit, presetId })
      
      setPresets(prev => prev.map(p => ({
        ...p,
        is_active: p.id === presetId ? 1 : 0
      })))
      
      toast.success('Pesquisa ativada! Os terminais já foram atualizados.')
    } catch (error) {
      toast.error('Erro ao ativar a pesquisa.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteRequest = (preset) => {
    setPresetToDelete(preset)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!presetToDelete) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/survey/presets/${presetToDelete.id}`)
      setPresets(prev => prev.filter(p => p.id !== presetToDelete.id))
      toast.success('Modelo excluído com sucesso.')
      setShowDeleteModal(false)
      setPresetToDelete(null)
    } catch (error) {
      toast.error('Erro ao excluir o modelo.')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <>
      <div className="pointer-events-none fixed -left-16 -top-12 z-0 h-72 w-72 rounded-full bg-purple-500/20 blur-[100px]" />
      <div className="pointer-events-none fixed -right-16 top-24 z-0 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative mx-auto flex h-[calc(100vh-5rem)] w-full max-w-[1500px] flex-col overflow-hidden px-2 pb-2 pt-3 md:h-[calc(100vh-5rem)] md:px-0 md:pb-0 md:pt-3"
      >
        {/* HEADER */}
        <div className="mb-2 flex shrink-0 items-center justify-between gap-4 md:mb-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
              Modelos Salvos
            </h1>
          </div>
          
          {canGoBackToEditor && (
            <button 
              onClick={() => navigate('/survey-edit')}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white h-10 w-10 md:w-auto md:px-4 rounded-xl border border-white/10 backdrop-blur-md transition-all font-bold text-[10px] uppercase tracking-wider"
            >
              <ChevronLeft size={16} />
              <span className="hidden md:inline">Voltar</span>
            </button>
          )}
        </div>

        {/* CONTAINER DA LISTA */}
        <div className="liquid-glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-purple-500/20 bg-black/20 p-3 shadow-2xl backdrop-blur-md md:p-4">
          
          <div className="relative z-10 mb-3 flex shrink-0 items-center gap-3 border-b border-white/10 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 md:h-9 md:w-9">
              <Bookmark size={16} />
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                Acervo de Pesquisas ({currentUnit})
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                {presets.length} modelos cadastrados
              </p>
            </div>
          </div>

          <div className="custom-scrollbar relative min-h-0 flex-1 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex h-full flex-col items-center justify-center text-purple-400">
                <Loader2 size={32} className="mb-3 animate-spin md:w-[40px]" />
                <p className="text-[10px] font-black uppercase tracking-widest">Carregando modelos...</p>
              </div>
            ) : presets.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-white/20">
                <FileText size={48} className="mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center">
                  Nenhum modelo salvo.<br/>Crie um novo no Editor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 pb-4">
                <AnimatePresence>
                  {presets.map((preset) => (
                    <PresetCard 
                      key={preset.id}
                      preset={preset}
                      isActive={preset.is_active === 1}
                      actionLoadingId={actionLoadingId}
                      onActivate={handleActivate}
                      onDeleteRequest={handleDeleteRequest}
                      formatDate={formatDate}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Customizado) */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl md:absolute md:p-0"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="liquid-glass relative w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 p-6 text-center shadow-[0_16px_64px_rgba(225,29,72,0.18)] md:p-8 bg-black/60"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent" />

              <div className="relative">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/20 bg-rose-500/10 shadow-[0_0_30px_rgba(225,29,72,0.18)] md:mb-6 md:h-20 md:w-20">
                  <Trash2 size={28} className="text-rose-300 md:w-[36px]" />
                </div>

                <h3 className="mb-2 text-lg font-black uppercase tracking-widest text-white md:mb-3 md:text-xl">
                  Confirmar Exclusão
                </h3>

                <p className="mb-6 text-xs font-medium leading-relaxed text-white/60 md:mb-8 md:text-sm">
                  Tem certeza que deseja excluir permanentemente o modelo{' '}
                  <strong className="text-white">"{presetToDelete?.title}"</strong>? Esta ação não pode ser desfeita.
                </p>

                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1 rounded-2xl border border-transparent px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/50 transition hover:border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-50 md:px-5 md:py-4 md:text-xs"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_22px_rgba(225,29,72,0.28)] transition hover:bg-rose-400 active:scale-95 disabled:opacity-50 md:px-5 md:py-4 md:text-xs"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin md:w-[16px]" /> : 'Excluir'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}