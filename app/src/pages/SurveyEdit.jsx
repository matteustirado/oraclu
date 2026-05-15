import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ImagePlus, X, Save, Rocket, FileText, 
  SlidersHorizontal, ToggleLeft, SplitSquareHorizontal,
  BarChart2, Bookmark, Smile, Loader2, Check
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
  const [pages, setPages] = useState([{ id: 1, title: '', questions: [], isConditional: false, condQuestionId: null, condValue: '' }])
  const [activePageIndex, setActivePageIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState(0)
  
  const [isConditionExpanded, setIsConditionExpanded] = useState(true)

  const activePage = pages[activePageIndex]

  useEffect(() => {
    if (activePage?.isConditional) {
      setIsConditionExpanded(!activePage.condQuestionId || !activePage.condValue)
    }
  }, [activePageIndex])

  const handleAddPage = (isConditional = false) => {
    const newPageId = pages.length > 0 ? Math.max(...pages.map(p => p.id)) + 1 : 1
    setPages([...pages, { 
      id: newPageId, 
      title: '',
      questions: [], 
      isConditional, 
      condQuestionId: null, 
      condValue: '' 
    }])
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
    if (activePage.isConditional && (!activePage.condQuestionId || !activePage.condValue)) {
      setIsConditionExpanded(true)
      return toast.warning("Defina a regra condicional antes de adicionar perguntas.")
    }

    if (activePage.isConditional && isConditionExpanded) {
      setIsConditionExpanded(false)
    }

    const hasThisThat = activePage.questions.some(q => q.type === 'THIS_THAT')
    if (hasThisThat) {
      return toast.warning("A opção 'Este/Aquele' ocupa a página inteira. Crie uma nova página.")
    }
    if (type === 'THIS_THAT' && activePage.questions.length > 0) {
      return toast.warning("A opção 'Este/Aquele' deve ficar sozinha. Crie uma nova página vazia para ela.")
    }

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

  const handlePageFieldChange = (field, value) => {
    const newPages = [...pages]
    newPages[activePageIndex][field] = value
    if (field === 'condQuestionId') {
      newPages[activePageIndex].condValue = ''
    }
    setPages(newPages)
  }

  const getPreviousQuestions = () => {
    return pages.slice(0, activePageIndex).flatMap(p => p.questions)
  }

  const getSelectedQuestion = (id) => {
    return getPreviousQuestions().find(q => String(q.id) === String(id))
  }

  const getConditionLabel = (val, questionId) => {
    const q = getSelectedQuestion(questionId)
    if (!q) return val
    if (val === 'true') return 'Sim'
    if (val === 'false') return 'Não'
    if (val === 'A') return 'Opção 1'
    if (val === 'B') return 'Opção 2'
    
    if (q.type === 'SCALE_10') {
      if (val === 'BAD') return 'Ruim (1 a 3)'
      if (val === 'NEUTRAL') return 'Médio (4 a 7)'
      if (val === 'GOOD') return 'Bom (8 a 10)'
    }
    if (q.type === 'EMOJI_SCALE') {
      if (val === 'BAD') return 'Ruim (😡 / 😕)'
      if (val === 'NEUTRAL') return 'Médio (😐)'
      if (val === 'GOOD') return 'Bom (🙂 / 😍)'
    }
    return val
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
    if (!presetName.trim()) return toast.warning('Defina um nome interno para o Preset.')
    
    // Varredura rigorosa de integridade dos dados antes de salvar
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      if (!page.title || !page.title.trim()) {
        setActivePageIndex(i);
        return toast.warning(`Preencha o Título da Página ${i + 1}.`)
      }

      if (page.isConditional && (!page.condQuestionId || !page.condValue)) {
        setActivePageIndex(i);
        setIsConditionExpanded(true);
        return toast.warning(`Configure a Regra de Exibição na Página ${i + 1}.`)
      }

      if (page.questions.length === 0) {
        setActivePageIndex(i);
        return toast.warning(`A Página ${i + 1} precisa ter pelo menos uma pergunta.`)
      }

      for (let j = 0; j < page.questions.length; j++) {
        const q = page.questions[j];
        if (!q.text || !q.text.trim()) {
          setActivePageIndex(i);
          return toast.warning(`Preencha o texto da Pergunta ${j + 1} na Página ${i + 1}.`)
        }
        if (q.type === 'THIS_THAT' && (!q.imgA || !q.imgB)) {
          setActivePageIndex(i);
          return toast.warning(`Você precisa enviar as 2 imagens na Pergunta da Página ${i + 1}.`)
        }
      }
    }
    
    setIsSaving(true)
    try {
      const userStr = localStorage.getItem('oraclu_user')
      const user = userStr ? JSON.parse(userStr) : { unit: 'SP' }
      await api.post(`/api/survey/presets`, { 
        unit: user.unit,
        title: presetName,
        pages: pages 
      })
      toast.success("Configuração salva com sucesso!")
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
            onClick={() => handleAddPage(false)}
            className="flex shrink-0 items-center gap-1.5 px-2.5 py-2.5 sm:px-4 sm:py-2.5 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <Plus size={14} /> 
            <span className="hidden sm:inline">Página</span>
            <span className="sm:hidden">Pág</span>
          </button>

          <button 
            onClick={() => handleAddPage(true)}
            className="flex shrink-0 items-center gap-1.5 px-2.5 py-2.5 sm:px-4 sm:py-2.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 hover:border-fuchsia-500/50 text-fuchsia-400 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <Plus size={14} /> 
            <span className="hidden sm:inline">Condicional</span>
            <span className="sm:hidden">Condição</span>
          </button>
          
          <div className="hidden sm:block w-px h-8 bg-white/10 mx-1 md:mx-2 shrink-0" />
          
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => handleAddQuestion('SCALE_10')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Nota 0 a 10"
            >
              <SlidersHorizontal size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Nota 0-10</span>
            </button>
            
            <button 
              onClick={() => handleAddQuestion('YES_NO')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Sim ou Não"
            >
              <ToggleLeft size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Sim / Não</span>
            </button>
            
            <button 
              onClick={() => handleAddQuestion('EMOJI_SCALE')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Escala Emoji"
            >
              <Smile size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Emoji</span>
            </button>

            <button 
              onClick={() => handleAddQuestion('THIS_THAT')}
              className="flex shrink-0 items-center justify-center gap-2 p-2.5 sm:px-4 sm:py-2.5 bg-black/35 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-purple-200 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest"
              title="Este ou Aquele (Imagens)"
            >
              <SplitSquareHorizontal size={16} className="sm:w-3.5 sm:h-3.5" /> 
              <span className="hidden sm:inline">Este/Aquele</span>
            </button>
          </div>
        </div>

        <div className="liquid-glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-3 md:p-4 mb-2 md:mb-3">
          
          <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 pb-3 mb-3 gap-2 md:gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button 
                onClick={handlePrevPage}
                disabled={activePageIndex === 0}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-20 transition-all md:h-9 md:w-9"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center flex-1 min-w-0 ml-1 md:ml-2 gap-3">
                <input 
                  type="text"
                  placeholder="Título da Página..."
                  value={activePage.title || ''}
                  onChange={(e) => handlePageFieldChange('title', e.target.value)}
                  className="w-full bg-transparent border-none text-white font-black text-lg md:text-xl outline-none placeholder:text-white/20 truncate"
                />
                {activePage.isConditional && (
                  <span className="hidden sm:flex shrink-0 items-center justify-center rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-fuchsia-400">
                    Condicional
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              {activePage.isConditional && (
                <span className="sm:hidden flex shrink-0 items-center justify-center rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 h-8 text-[9px] font-black uppercase tracking-widest text-fuchsia-400">
                  Cond.
                </span>
              )}

              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                  Navegação
                </span>
                <span className="text-base font-black text-white leading-none md:text-lg">
                  {activePageIndex + 1} <span className="text-white/30">/ {pages.length}</span>
                </span>
              </div>
              
              <div className="flex sm:hidden items-center justify-center bg-white/5 h-8 px-3 rounded-xl">
                <span className="text-sm font-black text-white">{activePageIndex + 1} <span className="text-white/30">/ {pages.length}</span></span>
              </div>

              {pages.length > 1 && (
                <button 
                  onClick={handleDeletePage}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all md:h-9 md:w-9"
                  title="Excluir Página"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <button 
                onClick={handleNextPage}
                disabled={activePageIndex === pages.length - 1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 disabled:opacity-20 transition-all md:h-9 md:w-9"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 w-full flex flex-col">
            <AnimatePresence initial={false} custom={slideDirection} mode="wait">
              <motion.div
                key={activePage.id}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 h-full flex flex-col"
              >
                {activePage.isConditional && (
                  <div className={`mb-3 rounded-2xl border-2 bg-fuchsia-500/10 p-2.5 relative shrink-0 transition-all ${isConditionExpanded ? 'border-dashed border-fuchsia-500/50' : 'border-solid border-fuchsia-500/20 hover:border-fuchsia-500/40'}`}>
                    <button 
                      onClick={() => setIsConditionExpanded(!isConditionExpanded)}
                      className="w-full flex items-center justify-between cursor-pointer outline-none group"
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal size={16} className="text-fuchsia-400" />
                        <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-fuchsia-400">Regra de Exibição</h3>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {!isConditionExpanded && activePage.condQuestionId && activePage.condValue ? (
                          <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 text-[9px] font-bold uppercase tracking-widest text-fuchsia-300">
                            SE: "{getSelectedQuestion(activePage.condQuestionId)?.text?.substring(0, 15)}..." <ChevronRight size={10} className="text-fuchsia-400/50" /> {getConditionLabel(activePage.condValue, activePage.condQuestionId)}
                          </span>
                        ) : !isConditionExpanded && (
                          <span className="hidden sm:inline-block px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[9px] font-bold uppercase tracking-widest text-rose-300">
                            Regra Incompleta
                          </span>
                        )}
                        <div className="w-6 h-6 rounded-md bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center group-hover:bg-fuchsia-500/30 transition-colors">
                          {isConditionExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isConditionExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col md:flex-row gap-3 pt-3 mt-2 border-t border-fuchsia-500/20">
                            <div className="flex-1">
                              <label className="text-[9px] uppercase font-bold text-fuchsia-300/70 tracking-widest block mb-1">
                                Exibir se a resposta da pergunta:
                              </label>
                              <select 
                                value={activePage.condQuestionId || ''} 
                                onChange={(e) => handlePageFieldChange('condQuestionId', e.target.value)}
                                className="w-full bg-black/40 border border-fuchsia-500/20 focus:border-fuchsia-500 outline-none rounded-xl p-2 text-xs md:text-sm font-bold text-white transition-colors"
                              >
                                <option value="" className="bg-gray-900">Selecione uma pergunta...</option>
                                {getPreviousQuestions().map(q => (
                                  <option key={q.id} value={q.id} className="bg-gray-900">
                                    {q.text ? (q.text.length > 50 ? q.text.substring(0, 50) + '...' : q.text) : 'Pergunta sem texto'}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex-1">
                              <label className="text-[9px] uppercase font-bold text-fuchsia-300/70 tracking-widest block mb-1">
                                For igual a:
                              </label>
                              <select 
                                disabled={!activePage.condQuestionId}
                                value={activePage.condValue || ''} 
                                onChange={(e) => handlePageFieldChange('condValue', e.target.value)}
                                className="w-full bg-black/40 border border-fuchsia-500/20 disabled:opacity-50 focus:border-fuchsia-500 outline-none rounded-xl p-2 text-xs md:text-sm font-bold text-white transition-colors"
                              >
                                <option value="" className="bg-gray-900">Selecione o valor...</option>
                                {getSelectedQuestion(activePage.condQuestionId)?.type === 'YES_NO' && (
                                  <>
                                    <option value="true" className="bg-gray-900">Sim</option>
                                    <option value="false" className="bg-gray-900">Não</option>
                                  </>
                                )}
                                {getSelectedQuestion(activePage.condQuestionId)?.type === 'THIS_THAT' && (
                                  <>
                                    <option value="A" className="bg-gray-900">Opção 1 (A)</option>
                                    <option value="B" className="bg-gray-900">Opção 2 (B)</option>
                                  </>
                                )}
                                {getSelectedQuestion(activePage.condQuestionId)?.type === 'SCALE_10' && (
                                  <>
                                    <option value="BAD" className="bg-gray-900">Ruim (1 a 3)</option>
                                    <option value="NEUTRAL" className="bg-gray-900">Médio (4 a 7)</option>
                                    <option value="GOOD" className="bg-gray-900">Bom (8 a 10)</option>
                                  </>
                                )}
                                {getSelectedQuestion(activePage.condQuestionId)?.type === 'EMOJI_SCALE' && (
                                  <>
                                    <option value="BAD" className="bg-gray-900">Ruim (😡 / 😕)</option>
                                    <option value="NEUTRAL" className="bg-gray-900">Médio (😐)</option>
                                    <option value="GOOD" className="bg-gray-900">Bom (🙂 / 😍)</option>
                                  </>
                                )}
                              </select>
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <button 
                              disabled={!activePage.condQuestionId || !activePage.condValue}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsConditionExpanded(false);
                              }}
                              className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-white/5 disabled:text-white/20 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-colors"
                            >
                              <Check size={14} /> Confirmar Regra
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {(!activePage.isConditional || !isConditionExpanded) && (
                    <motion.div
                      key="questions-area"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex min-h-0 flex-1 w-full flex-col"
                    >
                      {activePage.questions.length === 0 ? (
                        <div className={`flex flex-1 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed text-white/20 ${activePage.isConditional ? 'border-fuchsia-500/20 bg-fuchsia-500/5' : 'border-white/10'}`}>
                          <FileText size={32} className="mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            {activePage.isConditional ? 'Adicione perguntas para esta regra' : 'Página Vazia'}
                          </p>
                        </div>
                      ) : (
                        <div className={`grid gap-2 md:gap-3 flex-1 w-full overflow-y-auto custom-scrollbar pr-1 ${activePage.questions[0]?.type === 'THIS_THAT' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                          {activePage.questions.map((q, index) => (
                            <div key={q.id} className="relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-3 shadow-lg transition-all hover:border-white/20">
                              <button 
                                onClick={() => handleRemoveQuestion(q.id)}
                                className="absolute right-2 top-2 text-white/20 transition-colors hover:text-rose-500 z-10"
                              >
                                <Trash2 size={14} />
                              </button>

                              <div className="mb-2 flex shrink-0 items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-md border border-purple-500/30 bg-purple-500/20 text-[9px] font-black text-purple-300">
                                  {index + 1}
                                </span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-fuchsia-400">
                                  {getQuestionTypeLabel(q.type)}
                                </span>
                              </div>

                              <textarea 
                                placeholder="Digite a pergunta..."
                                value={q.text}
                                onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
                                className="custom-scrollbar w-full shrink-0 resize-none border-b border-white/10 bg-transparent pb-1 pr-6 text-[10px] md:text-xs font-bold text-white transition-colors placeholder:text-white/20 focus:border-purple-500 focus:outline-none"
                                rows="2"
                              />

                              <div className={`mt-2 flex min-h-0 flex-1 w-full ${q.type === 'THIS_THAT' ? 'items-stretch' : 'items-center justify-center'}`}>
                                
                                {q.type === 'EMOJI_SCALE' && (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                                    <div className="flex w-full max-w-[180px] items-center justify-between rounded-xl border border-white/5 bg-black/40 p-1.5">
                                      <span className="text-base md:text-lg opacity-50 drop-shadow-md">😡</span>
                                      <span className="text-base md:text-lg opacity-70 drop-shadow-md">😕</span>
                                      <span className="text-base md:text-lg opacity-80 drop-shadow-md">😐</span>
                                      <span className="text-base md:text-lg opacity-90 drop-shadow-md">🙂</span>
                                      <span className="text-base md:text-lg drop-shadow-md">😍</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-1">Prévia</span>
                                  </div>
                                )}

                                {q.type === 'THIS_THAT' && (
                                  <div className="flex h-full w-full flex-col items-center pb-1">
                                    <div className="grid w-full flex-1 min-h-0 grid-cols-2 gap-1.5">
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
                                              <ImagePlus size={14} className="mb-1" />
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
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-1">Prévia</span>
                                  </div>
                                )}
                                
                                {q.type === 'SCALE_10' && (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                                    <div className="flex flex-nowrap justify-center gap-0.5 sm:gap-1">
                                      {Array.from({ length: 11 }, (_, i) => i).map(num => (
                                        <div key={num} className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/10 bg-black/40 text-[8px] font-black text-white/50 sm:h-5 sm:w-5">
                                          {num}
                                        </div>
                                      ))}
                                    </div>
                                    <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/20">Prévia</span>
                                  </div>
                                )}

                                {q.type === 'YES_NO' && (
                                  <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                                    <div className="flex w-full max-w-[140px] gap-2">
                                      <div className="flex flex-1 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                        Sim
                                      </div>
                                      <div className="flex flex-1 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 py-1 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-rose-400">
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
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:justify-end md:gap-3">
          <div className="flex h-10 w-full items-center gap-2 rounded-2xl border border-white/10 bg-black/35 p-1 sm:w-auto md:h-11">
            <input 
              type="text" 
              placeholder="Nome Interno do Preset..." 
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