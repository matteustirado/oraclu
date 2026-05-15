import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Calendar, FileText, ChevronRight, 
  Users, Clock, MessageSquare, SearchX, MapPin, Tag 
} from 'lucide-react'

import api from '../services/api'

const MONTHS = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export default function SurveyAns() {
  const navigate = useNavigate()
  
  const [userRole] = useState(() => {
    try {
      const userStr = localStorage.getItem('oraclu_user')
      return userStr ? JSON.parse(userStr).role : 'admin'
    } catch { return 'admin' }
  })

  const initialUnitFilter = ['super', 'admin'].includes(userRole) ? 'TODOS' : 
    (localStorage.getItem('oraclu_user') ? JSON.parse(localStorage.getItem('oraclu_user')).unit : 'SP')

  const [selectedUnit, setSelectedUnit] = useState(initialUnitFilter)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  
  const [isLoading, setIsLoading] = useState(true)
  const [surveys, setSurveys] = useState([])
  const [selectedSurvey, setSelectedSurvey] = useState(null)
  const [responses, setResponses] = useState([])
  const [isLoadingResponses, setIsLoadingResponses] = useState(false)

  const fetchSurveys = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get('/api/survey/reports/summary', {
        params: { unit: selectedUnit, month: selectedMonth, year: selectedYear }
      })
      setSurveys(res.data || [])
    } catch (error) {
      setSurveys([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedUnit, selectedMonth, selectedYear])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const handleSelectSurvey = async (survey) => {
    setSelectedSurvey(survey)
    setIsLoadingResponses(true)
    try {
      const res = await api.get(`/api/survey/reports/details/${survey.id}`, {
        params: { unit: selectedUnit, month: selectedMonth, year: selectedYear }
      })
      setResponses(res.data || [])
    } catch (error) {
      toast.error("Erro ao carregar respostas.")
      setResponses([])
    } finally {
      setIsLoadingResponses(false)
    }
  }

  const handleBackToList = () => {
    setSelectedSurvey(null)
    setResponses([])
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
          <div className="flex items-center gap-3 md:gap-4">
            <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">
              Relatório de Respostas
            </h1>
          </div>
          
          <button 
            onClick={() => navigate('/survey-edit')} 
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white h-10 w-10 md:w-auto md:px-4 rounded-xl border border-white/10 backdrop-blur-md transition-all font-bold text-[10px] uppercase tracking-wider"
            title="Voltar ao Editor"
          >
            <ArrowLeft size={16} />
            <span className="hidden md:inline">Voltar</span>
          </button>
        </div>

        <div className="liquid-glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-purple-500/20 bg-black/20 shadow-2xl backdrop-blur-md p-3 md:p-4 mb-2 md:mb-3">
          
          <div className="relative z-10 mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 w-full md:w-auto bg-black/40 rounded-xl p-1 border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Calendar size={14} />
              </div>
              
              <select 
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value))
                  setSelectedSurvey(null)
                }}
                className="bg-transparent border-none text-white text-[10px] md:text-xs font-bold px-2 py-1 outline-none cursor-pointer flex-1 md:w-32"
              >
                {MONTHS.map(m => <option key={m.value} value={m.value} className="bg-gray-900">{m.label}</option>)}
              </select>
              
              <div className="w-px h-4 bg-white/20 mx-1" />
              
              <select 
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value))
                  setSelectedSurvey(null)
                }}
                className="bg-transparent border-none text-white text-[10px] md:text-xs font-bold px-2 py-1 outline-none cursor-pointer w-20 text-center"
              >
                {YEARS.map(y => <option key={y} value={y} className="bg-gray-900">{y}</option>)}
              </select>
            </div>

            {['super', 'admin'].includes(userRole) && (
              <div className="flex items-center gap-2 w-full md:w-auto bg-black/40 rounded-xl p-1 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center shrink-0">
                  <MapPin size={14} />
                </div>
                
                <select 
                  value={selectedUnit}
                  onChange={(e) => {
                    setSelectedUnit(e.target.value)
                    setSelectedSurvey(null)
                  }}
                  className="bg-transparent border-none text-white text-[10px] md:text-xs font-bold px-2 py-1 outline-none cursor-pointer w-full md:w-32"
                >
                  <option value="TODOS" className="bg-gray-900">TODAS</option>
                  <option value="SP" className="bg-gray-900">SÃO PAULO</option>
                  <option value="BH" className="bg-gray-900">BELO HORIZONTE</option>
                </select>
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1 w-full">
            <AnimatePresence mode="wait">
              {!selectedSurvey ? (
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 overflow-y-auto custom-scrollbar pr-1"
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-purple-400">
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Carregando dados...</p>
                    </div>
                  ) : surveys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/20">
                      <SearchX size={40} className="mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-center">
                        Sem dados em {MONTHS.find(m => m.value === selectedMonth)?.label} / {selectedYear}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pb-2">
                      {surveys.map(survey => (
                        <div 
                          key={survey.id}
                          onClick={() => handleSelectSurvey(survey)}
                          className="bg-black/40 border border-white/5 hover:border-purple-500/30 rounded-2xl p-4 cursor-pointer group transition-all hover:bg-black/60 flex flex-col gap-3 relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-fuchsia-500/0 to-purple-500/5 group-hover:opacity-100 opacity-0 transition-opacity" />
                          
                          <div className="relative z-10 flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform shrink-0">
                                <FileText size={16} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h3 className="text-sm font-black text-white truncate">{survey.title}</h3>
                                <p className="text-[9px] uppercase font-bold tracking-widest text-white/40 mt-0.5">Predefinição</p>
                              </div>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-white/5 text-white/30 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors shrink-0">
                              <ChevronRight size={14} />
                            </div>
                          </div>

                          <div className="relative z-10 grid grid-cols-2 gap-2 mt-2 border-t border-white/5 pt-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
                                <Users size={12} className="text-fuchsia-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-white leading-none">{survey.total_responses || 0}</span>
                                <span className="text-[8px] uppercase font-bold tracking-widest text-white/40 mt-0.5">Votos</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <MessageSquare size={12} className="text-purple-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-white leading-none">{survey.total_questions || 0}</span>
                                <span className="text-[8px] uppercase font-bold tracking-widest text-white/40 mt-0.5">Perguntas</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col bg-black/40 rounded-xl border border-white/5"
                >
                  <div className="p-3 border-b border-white/5 flex items-center gap-3 shrink-0">
                    <button 
                      onClick={handleBackToList}
                      className="w-8 h-8 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white flex items-center justify-center transition-colors shrink-0"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-sm font-black text-white truncate">{selectedSurvey.title}</h2>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-fuchsia-400 truncate">Votos individuais</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4">
                    {isLoadingResponses ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Carregando votos...</p>
                      </div>
                    ) : responses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-white/20">
                        <MessageSquare size={40} className="mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-center">Sem votos registrados</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {responses.map((resp, idx) => (
                          <div key={idx} className="bg-black/50 border border-white/10 rounded-xl p-4 relative">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-white/5">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-2 text-purple-300">
                                  <Users size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px] sm:max-w-full">
                                    {resp.client_name} <span className="text-white/30">({resp.client_code})</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-500/90 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20 w-max">
                                  <Tag size={10} />
                                  <span className="text-[9px] font-black tracking-widest uppercase">
                                    Cupom: {resp.coupon}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-white/40">
                                <Clock size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">
                                  {new Date(resp.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {resp.answers && resp.answers.map((ans, aIdx) => (
                                <div key={aIdx} className="flex flex-col gap-1">
                                  <span className="text-[10px] font-bold text-white/60 line-clamp-2">{ans.question_text}</span>
                                  <div className="text-xs font-black text-white">
                                    {ans.question_type === 'SCALE_10' && (
                                      <span className="flex items-center gap-1">
                                        <span className="text-fuchsia-400">{ans.answer_value}</span> / 10
                                      </span>
                                    )}
                                    {ans.question_type === 'YES_NO' && (
                                      <span className={ans.answer_value === 'true' ? 'text-emerald-400' : 'text-rose-400'}>
                                        {ans.answer_value === 'true' ? 'SIM' : 'NÃO'}
                                      </span>
                                    )}
                                    {ans.question_type === 'THIS_THAT' && (
                                      <span className="text-purple-400 uppercase text-[10px]">
                                        Escolheu: {ans.answer_value}
                                      </span>
                                    )}
                                    {ans.question_type === 'EMOJI_SCALE' && (
                                      <span className="text-lg filter drop-shadow-md">
                                        {ans.answer_value}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  )
}