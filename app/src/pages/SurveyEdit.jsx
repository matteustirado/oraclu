import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, ChevronLeft, ChevronRight, 
  ImagePlus, X, Save, Rocket, FileText, 
  SlidersHorizontal, ToggleLeft, SplitSquareHorizontal,
  BarChart2, Bookmark, Smile, Loader2
} from 'lucide-react'

import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4040'

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 300 : -300, opacity: 0 })
}

export default function SurveyEdit() {
  const navigate = useNavigate()
  
  const [presetName, setPresetName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [pages, setPages] = useState([{ id: 1, questions: [] }])
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState(0)

  const activePage = pages[activePageIndex]

  const handleAddPage = () => {
    const newPageId = pages.length > 0 ? Math.max(...pages.map(p => p.id)) + 1 : 1
    setPages([...pages, { id: newPageId, questions: [] }])
    setSlideDirection(1)
    setActivePageIndex(pages.length)
  }

  const handlePrevPage = () => {
    if (activePageIndex > 0) {
      setSlideDirection(-1)
      setActivePageIndex(activePageIndex - 1)
    }
  }

  const handleNextPage = () => {
    if (activePageIndex < pages.length - 1) {
      setSlideDirection(1)
      setActivePageIndex(activePageIndex + 1)
    }
  }

  const handleDeletePage = () => {
    if (pages.length === 1) return toast.warning('Mínimo de uma página necessário.')
    const newPages = pages.filter((_, idx) => idx !== activePageIndex)
    setPages(newPages)
    setSlideDirection(-1)
    setActivePageIndex(Math.max(0, activePageIndex - 1))
  }

  const handleAddQuestion = (type) => {
    // --- NOVA REGRA DO "ESTE OU AQUELE" ---
    const hasThisThat = activePage.questions.some(q => q.type === 'THIS_THAT')
    if (hasThisThat) {
      return toast.warning("A opção 'Este/Aquele' ocupa a página inteira. Crie uma nova página.")
    }
    if (type === 'THIS_THAT' && activePage.questions.length > 0) {
      return toast.warning("A opção 'Este/Aquele' deve ficar sozinha. Crie uma nova página vazia para ela.")
    }
    // --------------------------------------

    if (activePage.questions.length >= 3) {
      return toast.warning('Máximo de 3 perguntas por página.')
    }

    const newQuestion = {
      id: Date.now(),
      text: '',
      type: type,
      imgA: '',
      imgB: ''
    }

    const newPages = [...pages]
    newPages[activePageIndex].questions.push(newQuestion)
    setPages(newPages)
  }

  const handleRemoveQuestion = (qId) => {
    const newPages = [...pages]
    newPages[activePageIndex].questions = newPages[activePageIndex].questions.filter(q => q.id !== qId)
    setPages(newPages)
  }

  const handleQuestionChange = (qId, field, value) => {
    const newPages = [...pages]
    const qIndex = newPages[activePageIndex].questions.findIndex(q => q.id === qId)
    if (qIndex !== -1) {
      newPages[activePageIndex].questions[qIndex][field] = value
      setPages(newPages)
    }
  }

  const handleImageUpload = async (qId, optionField, file) => {
    if (!file) return
    const formData = new FormData()
    formData.append('surveyImage', file)
    const toastId = toast.loading("Enviando mídia...")

    try {
      const res = await api.post(`/api/survey/upload`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      handleQuestionChange(qId, optionField, res.data.url)
      toast.update(toastId, { render: "Upload concluído!", type: "success", isLoading: false, autoClose: 2000 })
    } catch (error) {
      toast.update(toastId, { render: "Erro no upload.", type: "error", isLoading: false, autoClose: 3000 })
    }
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) return toast.warning('Defina um nome para a predefinição.')
    
    setIsSaving(true)
    try {
      const userStr = localStorage.getItem('oraclu_user')
      const user = userStr ? JSON.parse(userStr) : { unit: 'SP' }
      await api.post(`/api/survey/presets`, { 
        unit: user.unit,
        title: presetName,
        pages: pages 
      })
      toast.success("Configuração salva!")
      setPresetName('')
    } catch (error) {
      toast.error("Erro ao salvar dados.")
    } finally {
      setIsSaving(false)
    }
  }

  const getQuestionTypeLabel = (type) => {
    switch(type) {
      case 'SCALE_10': return 'Escala 0 a 10'
      case 'YES_NO': return 'Sim ou Não'
      case 'THIS_THAT': return 'Este ou Aquele'
      case 'EMOJI_SCALE': return 'Emojis'
      default: return type.replace('_', ' ')
    }
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
        <div className="mb-2 flex shrink-0 items-center justify-between gap-4 md:mb-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
              Editor de Pesquisa
            </h1>
          </div>

          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => navigate('/survey-ans')}
              className="flex h-10 w-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:h-auto md:w-auto md:px-4 md:py-2.5"
              title="Respostas"
            >
              <BarChart2 size={16} className="md:w-[16px]" />
              <span className="hidden text-xs font-black uppercase tracking-widest md:inline">
                Respostas
              </span>
            </button>

            <button
              onClick={() => navigate('/survey-presets')}
              className="flex h-10 w-10 items-center justify-center gap-2 rounded-2xl border border-purple-500/30 bg-purple-500/15 text-purple-300 transition hover:bg-purple-500/25 md:h-auto md:w-auto md:px-4 md:py-2.5"
              title="Predefinições"
            >
              <Bookmark size={16} className="md:w-[16px]" />
              <span className="hidden text-xs font-black uppercase tracking-widest md:inline">
                Modelos Salvos
              </span>
            </button>
          </div>
        </div>

        <div className="liquid-glass relative mb-2 shrink-0 overflow-x-auto custom-scrollbar rounded-2xl p-2 sm:p-3 md:mb-3 md:p-4 flex flex-nowrap items-center justify-between sm:justify-start gap-1 sm:gap-2">
          
          <button 
            onClick={handleAddPage}
            className="flex shrink-0 items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-2.5 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <Plus size={14} /> Página
          </button>
          
          <div className="hidden sm:block w-px h-8 bg-white/10 mx-1 md:mx-2 shrink-0" />
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => handleAddQuestion('SCALE_10')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Nota 0 a 10"
            >
              <SlidersHorizontal size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Nota 0-10</span>
            </button>
            
            <button 
              onClick={() => handleAddQuestion('YES_NO')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Sim ou Não"
            >
              <ToggleLeft size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Sim / Não</span>
            </button>
            
            <button 
              onClick={() => handleAddQuestion('EMOJI_SCALE')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Escala Emoji"
            >
              <Smile size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Emoji</span>
            </button>

            <button 
              onClick={() => handleAddQuestion('THIS_THAT')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-fuchsia-500/20 border border-white/10 hover:border-fuchsia-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Este ou Aquele (Imagens)"
            >
              <SplitSquareHorizontal size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Este/Aquele</span>
            </button>
          </div>
        </div>

        <div className="liquid-glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-3 md:p-4 mb-2 md:mb-3">
          
          <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 pb-3 mb-3">
            <button 
              onClick={handlePrevPage}
              disabled={activePageIndex === 0}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-20 transition-all md:h-9 md:w-9"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400">Página</span>
                <span className="text-base font-black text-white leading-none md:text-lg">{activePageIndex + 1} / {pages.length}</span>
              </div>
              {pages.length > 1 && (
                <button 
                  onClick={handleDeletePage}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all md:h-9 md:w-9"
                  title="Excluir Página"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <button 
              onClick={handleNextPage}
              disabled={activePageIndex === pages.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-20 transition-all md:h-9 md:w-9"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 w-full">
            <AnimatePresence initial={false} custom={slideDirection} mode="wait">
              <motion.div
                key={activePage.id}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 h-full"
              >
                {activePage.questions.length === 0 ? (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 text-white/20">
                    <FileText size={32} className="mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Página Vazia</p>
                  </div>
                ) : (
                  <div className={`grid gap-3 h-full w-full ${activePage.questions[0]?.type === 'THIS_THAT' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3 md:gap-4'}`}>
                    {activePage.questions.map((q, index) => (
                      <div key={q.id} className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4 shadow-lg transition-all hover:border-white/20">
                        <button 
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="absolute right-3 top-3 text-white/20 transition-colors hover:text-rose-500 z-10"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="mb-3 flex shrink-0 items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/20 text-[10px] font-black text-purple-300">
                            {index + 1}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-fuchsia-400">
                            {getQuestionTypeLabel(q.type)}
                          </span>
                        </div>

                        <textarea 
                          placeholder="Digite a pergunta..."
                          value={q.text}
                          onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                          className="custom-scrollbar w-full shrink-0 resize-none border-b border-white/10 bg-transparent pb-2 pr-6 text-xs font-bold text-white transition-colors placeholder:text-white/20 focus:border-purple-500 focus:outline-none"
                          rows="2"
                        />

                        <div className={`mt-3 flex min-h-0 flex-1 w-full ${q.type === 'THIS_THAT' ? 'items-stretch' : 'items-center justify-center'}`}>
                          
                          {q.type === 'EMOJI_SCALE' && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 pt-1">
                              <div className="flex w-full max-w-[200px] items-center justify-between rounded-xl border border-white/5 bg-black/40 p-2">
                                <span className="text-lg opacity-50 drop-shadow-md md:text-xl">😡</span>
                                <span className="text-lg opacity-70 drop-shadow-md md:text-xl">😕</span>
                                <span className="text-lg opacity-80 drop-shadow-md md:text-xl">😐</span>
                                <span className="text-lg opacity-90 drop-shadow-md md:text-xl">🙂</span>
                                <span className="text-lg drop-shadow-md md:text-xl">😍</span>
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-1">Prévia</span>
                            </div>
                          )}

                          {q.type === 'THIS_THAT' && (
                            <div className="flex h-full w-full flex-col items-center pb-1">
                              <div className="grid w-full flex-1 min-h-0 grid-cols-2 gap-2">
                                {['imgA', 'imgB'].map((field) => (
                                  <div key={field} className="group/img relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/50">
                                    {q[field] ? (
                                      <>
                                        <img src={`${API_URL}${q[field]}`} className="h-full w-full object-cover" alt="Preview" />
                                        <button 
                                          onClick={() => handleQuestionChange(q.id, field, '')}
                                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/80 text-white opacity-0 transition-all hover:bg-rose-600 group-hover/img:opacity-100"
                                        >
                                          <X size={12} />
                                        </button>
                                      </>
                                    ) : (
                                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center text-white/20 transition-all hover:bg-purple-500/5 hover:text-purple-400">
                                        <ImagePlus size={16} className="mb-1" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">{field === 'imgA' ? 'Opção 1' : 'Opção 2'}</span>
                                        <input 
                                          type="file" 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => handleImageUpload(q.id, field, e.target.files[0])} 
                                        />
                                      </label>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-2">Prévia</span>
                            </div>
                          )}
                          
                          {q.type === 'SCALE_10' && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 pt-1">
                              <div className="flex flex-nowrap justify-center gap-0.5 sm:gap-1">
                                {Array.from({ length: 11 }, (_, i) => i).map(num => (
                                  <div key={num} className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/10 bg-black/40 text-[9px] font-black text-white/50 sm:h-6 sm:w-6">
                                    {num}
                                  </div>
                                ))}
                              </div>
                              <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/20">Prévia</span>
                            </div>
                          )}

                          {q.type === 'YES_NO' && (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 pt-1">
                              <div className="flex w-full max-w-[160px] gap-2">
                                <div className="flex flex-1 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                  Sim
                                </div>
                                <div className="flex flex-1 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 py-1.5 text-[9px] font-black uppercase tracking-widest text-rose-400">
                                  Não
                                </div>
                              </div>
                              <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/20">Prévia</span>
                            </div>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:justify-end md:gap-3">
          <div className="flex h-10 w-full items-center gap-2 rounded-2xl border border-white/10 bg-black/35 p-1 sm:w-auto md:h-11">
            <input 
              type="text" 
              placeholder="Nome do Preset..." 
              className="h-full w-full border-none bg-transparent px-3 text-[10px] font-black text-white outline-none placeholder:text-white/20 sm:w-56 md:text-xs" 
              value={presetName} 
              onChange={(e) => setPresetName(e.target.value)} 
            />
            <button 
              onClick={handleSavePreset} 
              disabled={isSaving}
              className="flex h-full items-center justify-center rounded-xl bg-white/5 px-4 text-white/60 transition hover:bg-white/10 hover:text-white"
              title="Salvar Preset"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            </button>
          </div>

          <button 
            onClick={() => toast.info('Sincronização em tempo real chegando! 🚀')}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_22px_rgba(168,85,247,0.28)] transition hover:brightness-110 active:scale-95 sm:w-auto md:h-11 md:px-10"
          >
            <Rocket size={14} className="md:w-[16px]" /> Ativar Terminal
          </button>
        </div>
      </motion.div>
    </>
  )
}