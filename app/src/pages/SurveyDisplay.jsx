import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, QrCode, Tag, X, Loader2, Copy } from 'lucide-react'
import api from '../services/api'
import { socket } from '../socket'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4040'

const VALIDATION_API = {
  SP: import.meta.env.VITE_API_URL_SP || 'https://dedalosadm2-3dab78314381.herokuapp.com',
  BH: import.meta.env.VITE_API_URL_BH || 'https://dedalosadm2bh-09d55dca461e.herokuapp.com'
}
const MASTER_CODE = '0108'

const EMOJIS = ['😡', '😕', '😐', '🙂', '😍']

export default function SurveyDisplay() {
  const [currentUnit] = useState(() => {
    try {
      const userStr = localStorage.getItem('oraclu_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        if (user.role === 'surveysp') return 'SP'
        if (user.role === 'surveybh') return 'BH'
        if (user.unit && user.unit !== 'BOTH') return user.unit.toUpperCase()
      }
    } catch (error) {}
    return 'SP'
  })

  const [config, setConfig] = useState(null)
  const [viewState, setViewState] = useState('idle')
  const [loading, setLoading] = useState(true)
  
  const [isBraceletModalOpen, setIsBraceletModalOpen] = useState(false)
  const [bracelet, setBracelet] = useState('')
  const [isValidatingBracelet, setIsValidatingBracelet] = useState(false)
  const [braceletError, setBraceletError] = useState(false)

  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [clientCode, setClientCode] = useState(null)
  
  const [couponStatus, setCouponStatus] = useState('loading')
  const [generatedCoupon, setGeneratedCoupon] = useState(null)
  const [copied, setCopied] = useState(false)

  const [exitClicks, setExitClicks] = useState(0)
  const idleTimerRef = useRef(null)
  const successTimerRef = useRef(null)

  useEffect(() => {
    let timeout
    if (exitClicks > 0 && exitClicks < 5) {
      timeout = setTimeout(() => setExitClicks(0), 3000)
    } else if (exitClicks >= 5) {
      localStorage.removeItem('oraclu_user')
      localStorage.removeItem('oraclu_token')
      window.location.href = '/login'
    }
    return () => clearTimeout(timeout)
  }, [exitClicks])

  const fetchActiveSurvey = useCallback(async () => {
    try {
      let activePreset = null
      try {
        const res = await api.get(`/api/survey/active/${currentUnit}`)
        if (res.data && res.data.id) activePreset = res.data
      } catch (e) {
        const resAll = await api.get(`/api/survey/presets/${currentUnit}`)
        const presets = resAll.data || []
        activePreset = presets.find(p => p.is_active === 1 || p.is_active === true)
      }

      if (activePreset) {
        if (typeof activePreset.pages === 'string') {
          try { activePreset.pages = JSON.parse(activePreset.pages) } catch (err) {}
        }
        setConfig(activePreset)
      } else {
        setConfig(null)
      }
    } catch (error) {
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [currentUnit])

  useEffect(() => {
    fetchActiveSurvey()

    const handleUpdate = () => fetchActiveSurvey()
    socket.on('survey_active_updated', handleUpdate)

    const intervalId = setInterval(() => {
      if (viewState === 'idle' && !isBraceletModalOpen) fetchActiveSurvey()
    }, 10000)

    return () => {
      socket.off('survey_active_updated', handleUpdate)
      clearInterval(intervalId)
    }
  }, [fetchActiveSurvey, viewState, isBraceletModalOpen])

  const validateCustomer = async (code) => {
    if (!code) return false
    const cleanCode = code.toString().trim()
    if (cleanCode === MASTER_CODE) return true

    const baseUrl = VALIDATION_API[currentUnit] || VALIDATION_API.SP
    const rootUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    const url = `${rootUrl}pesquisa/api/verificar_pulseira/?id=${cleanCode.toUpperCase()}`

    try {
      const response = await fetch(url)
      return response.ok
    } catch {
      return false
    }
  }

  const handleBraceletSubmit = async (e) => {
    e.preventDefault()
    if (!bracelet.trim()) return

    setIsValidatingBracelet(true)
    setBraceletError(false)

    const isValid = await validateCustomer(bracelet)

    setIsValidatingBracelet(false)

    if (isValid) {
      if (navigator.vibrate) navigator.vibrate(50)
      
      const parsedClientCode = bracelet.trim().toUpperCase()
      
      api.post('/api/survey/prepare', { unit: currentUnit, client_code: parsedClientCode }).catch(() => {})

      setAnswers({})
      setCurrentPageIndex(0)
      setGeneratedCoupon(null)
      setCouponStatus('loading')
      setCopied(false)
      setClientCode(parsedClientCode)
      setIsBraceletModalOpen(false)
      setBracelet('')
      setViewState('survey')
    } else {
      setBraceletError(true)
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      setTimeout(() => setBraceletError(false), 2000)
    }
  }

  const resetToIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setViewState('idle')
    setIsBraceletModalOpen(false)
    setCurrentPageIndex(0)
    setAnswers({})
    setBracelet('')
    setBraceletError(false)
    setGeneratedCoupon(null)
    setCouponStatus('loading')
    setCopied(false)
  }, [])

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    
    if (isBraceletModalOpen) {
      idleTimerRef.current = setTimeout(() => {
        setIsBraceletModalOpen(false)
        setBracelet('')
        setBraceletError(false)
      }, 10000)
    } else if (viewState === 'survey') {
      idleTimerRef.current = setTimeout(() => {
        resetToIdle()
      }, 40000)
    }
  }, [viewState, isBraceletModalOpen, resetToIdle])

  useEffect(() => {
    resetIdleTimer()
  }, [answers, currentPageIndex, viewState, bracelet, isBraceletModalOpen, resetIdleTimer])

  const handleIdleClick = () => {
    if (!config) return
    if (navigator.vibrate) navigator.vibrate(50)
    setIsBraceletModalOpen(true)
  }

  const handleAnswer = (questionId, value) => {
    if (navigator.vibrate) navigator.vibrate(20)
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const submitSurvey = useCallback(async () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    
    setViewState('success')
    setCouponStatus('loading')
    setGeneratedCoupon(null)

    try {
      const payloadAnswers = Object.entries(answers).map(([qId, val]) => ({
        question_id: Number(qId),
        answer_value: val.toString()
      }))

      const response = await api.post('/api/survey/responses', {
        unit: currentUnit,
        preset_id: config.id,
        client_code: clientCode,
        answers: payloadAnswers
      })

      if (response.data.couponFailed || !response.data.coupon) {
        setCouponStatus('error')
      } else {
        setGeneratedCoupon(response.data.coupon)
        setCouponStatus('success')
      }

    } catch (error) {
      setCouponStatus('error')
    } finally {
      successTimerRef.current = setTimeout(() => {
        resetToIdle()
      }, 20000)
    }
  }, [answers, clientCode, config, currentUnit, resetToIdle])

  useEffect(() => {
    if (viewState !== 'survey' || !config) return

    const activePageQuestions = config.pages?.[currentPageIndex]?.questions || []
    if (activePageQuestions.length === 0) return

    const allAnswered = activePageQuestions.every(q => answers[q.id] !== undefined)

    if (allAnswered) {
      const timer = setTimeout(() => {
        const isLastPage = currentPageIndex === (config.pages.length - 1)
        if (isLastPage) {
          submitSurvey()
        } else {
          setCurrentPageIndex(prev => prev + 1)
        }
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [answers, currentPageIndex, config, viewState, submitSurvey])


  const copyToClipboard = () => {
    if (!generatedCoupon) return
    navigator.clipboard.writeText(generatedCoupon)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderQuestionInput = (question) => {
    const currentValue = answers[question.id]

    switch (question.type) {
      case 'SCALE_10':
        return (
          <div className="flex flex-nowrap justify-center gap-1 sm:gap-2 mt-4 w-full">
            {Array.from({ length: 11 }, (_, i) => i).map(num => (
              <button
                key={num}
                onClick={() => handleAnswer(question.id, num)}
                className={`flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-black transition-all transform active:scale-90 shadow-md ${
                  currentValue === num 
                    ? 'bg-gradient-to-br from-orange-500 to-yellow-500 text-black scale-110 shadow-[0_0_15px_rgba(249,115,22,0.6)] border-none' 
                    : 'bg-[#151515] text-white/50 border border-white/5 hover:bg-white/10 hover:border-orange-500/50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        )

      case 'YES_NO':
        return (
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => handleAnswer(question.id, 'true')}
              className={`flex-1 max-w-[180px] py-4 sm:py-5 rounded-2xl text-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-md ${
                currentValue === 'true'
                  ? 'bg-gradient-to-br from-green-500 to-emerald-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] border-none scale-105'
                  : 'bg-[#151515] text-white/50 border border-white/5 hover:bg-white/10 hover:border-green-500/50'
              }`}
            >
              Sim
            </button>
            <button
              onClick={() => handleAnswer(question.id, 'false')}
              className={`flex-1 max-w-[180px] py-4 sm:py-5 rounded-2xl text-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-md ${
                currentValue === 'false'
                  ? 'bg-gradient-to-br from-rose-500 to-red-400 text-black shadow-[0_0_20px_rgba(225,29,72,0.4)] border-none scale-105'
                  : 'bg-[#151515] text-white/50 border border-white/5 hover:bg-white/10 hover:border-rose-500/50'
              }`}
            >
              Não
            </button>
          </div>
        )

      case 'EMOJI_SCALE':
        return (
          <div className="flex justify-center gap-3 sm:gap-6 mt-4">
            {EMOJIS.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(question.id, emoji)}
                className={`text-5xl sm:text-6xl transition-all transform active:scale-90 filter drop-shadow-md ${
                  currentValue === emoji 
                    ? 'scale-125 grayscale-0 opacity-100 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]' 
                    : currentValue ? 'grayscale opacity-30 hover:grayscale-0 hover:opacity-100' : 'hover:scale-110'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )

      case 'THIS_THAT':
        return (
          <div className="flex justify-center gap-4 mt-4 flex-1 min-h-[220px]">
            {['A', 'B'].map((opt) => {
              const val = opt === 'A' ? 'A' : 'B'
              const imgUrl = opt === 'A' ? question.imgA : question.imgB
              const isSelected = currentValue === val

              return (
                <button
                  key={val}
                  onClick={() => handleAnswer(question.id, val)}
                  className={`relative flex-1 max-w-[320px] rounded-3xl overflow-hidden transition-all active:scale-95 shadow-lg border-4 ${
                    isSelected 
                      ? 'border-orange-500 scale-105 shadow-[0_0_20px_rgba(249,115,22,0.5)] z-10' 
                      : 'border-transparent bg-[#151515] hover:border-orange-500/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={`${API_URL}${imgUrl}`} alt={`Opção ${val}`} className="absolute inset-0 w-full h-full object-cover" />
                  <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-orange-500/20' : 'bg-black/40 group-hover:bg-transparent'}`} />
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-black shadow-lg">
                      <CheckCircle2 size={20} strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50 animate-pulse font-black tracking-widest uppercase text-xs">
        Carregando Sistema...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-none flex flex-col items-center justify-center p-4 sm:p-6">
      
      <div 
        onClick={() => setExitClicks(prev => prev + 1)}
        className="fixed top-0 right-0 w-24 h-24 z-[999] cursor-pointer"
      />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-orange-600/10 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[100px] animate-float-reverse" />
      </div>

      <AnimatePresence mode="wait">
        
        {viewState === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative z-10 w-full max-w-[800px] h-[90vh] bg-black/60 backdrop-blur-md rounded-[2.5rem] border-[3px] border-transparent bg-clip-padding flex flex-col shadow-2xl justify-between p-6 sm:p-8 text-center cursor-pointer"
            style={{ borderImage: 'linear-gradient(135deg, #ff4d00, #ffcc00) 1', borderRadius: '2.5rem' }}
            onClick={handleIdleClick}
          >
            <div className="mt-4 sm:mt-8">
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400 mb-2 drop-shadow-sm tracking-tight uppercase">
                {config ? 'Sua Opinião Importa!' : 'Aguardando'}
              </h1>
              <p className="text-base sm:text-lg text-gray-400 font-medium tracking-wide">
                {config ? 'Responda as perguntas e ganhe descontos' : 'Nenhuma pesquisa ativa no momento.'}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center flex-1">
              {!config ? (
                <AlertCircle size={80} className="mx-auto text-white/20 mb-4" />
              ) : (
                <>
                  <p className="text-gray-500 text-sm sm:text-base mb-6 animate-pulse italic tracking-widest uppercase">
                    ...toque na tela para iniciar...
                  </p>
                  
                  <svg className="w-56 h-auto drop-shadow-[0_0_20px_rgba(255,77,0,0.4)]" viewBox="0 0 600 485" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="logo-gradient-stroke" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#FF4D00" />
                        <stop offset="100%" stopColor="#FFCC00" />
                      </linearGradient>
                    </defs>
                    <g fill="none" stroke="url(#logo-gradient-stroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path className="animate-draw-logo" d="M276 41.3c-12.4 19.9-79.5 127.5-149.2 239.1C57 392 0 483.7 0 484.2s8.4.7 18.7.6l18.6-.3L168.2 275C240.1 159.8 299.5 65.5 300 65.5c.6 0 59.9 94.3 131.9 209.5l130.8 209.5 18.8.3c15.1.2 18.6 0 18.3-1.1-.2-.7-67.3-108.7-149.3-240C359.6 98.2 300.9 5.1 300 5.1c-.9 0-10.6 14.7-24 36.2z" />
                      <path className="animate-draw-logo delay-100" d="M175.2 284.4C107.5 393 51.7 482.6 51.4 483.4c-.6 1.5 22.5 1.6 248.5 1.6 137 0 249.1-.2 249.1-.5 0-1.1-6.1-11.4-7.4-12.4-.8-.7-10.1-1.2-25.1-1.3l-23.8-.3-13.2-21c-7.2-11.6-50.1-80.3-95.4-152.8C324.5 201.4 301.3 165 300 165c-1.3 0-26.8 40-92.4 145.1-49.8 79.7-90.6 145.7-90.6 146.5 0 1.2 2 1.4 12.3 1.2l12.2-.3 78.7-126c43.3-69.3 79.1-126.1 79.6-126.3.7-.2 62 97.1 156 248l11.1 17.8H275l-.2-24.7-.3-24.8-12.2-.5-12.1-.5 23.1-37c12.8-20.4 24.1-38.5 25.3-40.3l2.1-3.3 23.8 38.3c13.1 21.1 24.5 39.4 25.4 40.7l1.5 2.3-7.1-.7c-10.6-1-11.3-.4-11.3 9.9 0 6.7.3 8.5 1.6 9 .9.3 11.7.6 24 .6H381v-2.4c0-1.4-15.8-27.7-39.3-65.3-29.7-47.6-39.7-62.8-41.2-62.8-1.4 0-11.4 15.2-41.2 63-21.6 34.6-39.3 64-39.3 65.2v2.3h37.9l.6 4.2c.3 2.4.5 9.2.3 15.3l-.3 11-41.3.3-41.3.2 2.3-3.8C189.3 448.8 299.6 273 300.1 273c.3 0 26.5 41.6 58.3 92.5l57.7 92.5h10c8.1 0 9.9-.3 9.9-1.5 0-.8-30.2-49.9-67.1-109.1-53.5-85.6-67.5-107.4-69-107.2-1.3.2-25.4 38-73.7 115.3l-71.9 115-32.1.3-32.1.2 39.8-63.7c22-35.1 69-110.4 104.5-167.3 35.6-56.9 65.1-103.5 65.6-103.5s46.1 72.2 101.2 160.5l100.3 160.5 14.9.3 14.8.3-.4-2.3C530.1 451.9 301.7 87 300 87c-.9 0-49.9 77.5-124.8 197.4z" />
                    </g>
                  </svg>
                </>
              )}
            </div>

            <div className="mb-4 sm:mb-8">
              {config && (
                <p className="text-orange-500/90 text-sm md:text-base font-bold tracking-[0.2em] uppercase transition-colors animate-pulse">
                  Comece agora e libere sua recompensa!
                </p>
              )}
            </div>
          </motion.div>
        )}

        {viewState === 'survey' && (
          <motion.main 
            key="survey"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative z-10 w-full max-w-[900px] h-[95vh] bg-black/60 backdrop-blur-md rounded-[2.5rem] border-[3px] border-transparent bg-clip-padding flex flex-col shadow-2xl"
            style={{ borderImage: 'linear-gradient(135deg, #ff4d00, #ffcc00) 1', borderRadius: '2.5rem' }}
          >
            <div className="pt-6 pb-4 px-6 sm:px-10 text-center shrink-0 border-b border-white/5">
              <h1 className="text-xl md:text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400 leading-tight drop-shadow-md">
                {config.title}
              </h1>
              <div className="flex justify-center gap-2 mt-3">
                {config.pages.map((_, idx) => (
                  <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === currentPageIndex ? 'w-8 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'w-2 bg-white/20'}`} />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col justify-center gap-6 sm:gap-8">
              {config?.pages?.[currentPageIndex]?.questions.map((q) => (
                <div key={q.id} className="flex flex-col text-center bg-[#151515] p-5 md:p-8 rounded-[2rem] border border-white/5 shadow-xl">
                  <h3 className="text-xl md:text-2xl font-black text-gray-200 mb-2 sm:mb-4 leading-relaxed uppercase">
                    {q.text}
                  </h3>
                  {renderQuestionInput(q)}
                </div>
              ))}
            </div>

            <div className="p-4 flex items-center justify-center shrink-0">
              <button 
                onClick={resetToIdle}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white/80 hover:bg-white/5 transition-colors"
              >
                <X size={14} /> Cancelar Pesquisa
              </button>
            </div>
          </motion.main>
        )}

        {viewState === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="relative z-10 w-full max-w-[600px] h-[90vh] bg-black/60 backdrop-blur-md rounded-[2.5rem] border-[3px] border-transparent bg-clip-padding flex flex-col shadow-2xl justify-between p-6 sm:p-8 text-center"
            style={{ 
              borderImage: couponStatus === 'error' ? 'linear-gradient(135deg, #ef4444, #9f1239) 1' : 'linear-gradient(135deg, #ff4d00, #ffcc00) 1', 
              borderRadius: '2.5rem' 
            }}
          >
            <div className="mt-4">
              <h1 className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r mb-1 drop-shadow-sm uppercase ${couponStatus === 'error' ? 'from-red-400 to-rose-600' : 'from-green-400 to-emerald-600'}`}>
                {couponStatus === 'error' ? 'AVALIAÇÃO SALVA' : 'ISSO AÍ!'}
              </h1>
              <p className="text-base sm:text-lg text-gray-400 font-medium">Sua avaliação foi registrada.</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 my-4">
              {couponStatus === 'error' ? (
                <div className="bg-[#151515] border border-red-500/50 rounded-[2rem] p-6 shadow-[0_0_30px_rgba(225,29,72,0.2)] flex flex-col items-center w-full max-w-[320px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
                  <AlertCircle size={48} className="text-red-500 mb-4" />
                  <h3 className="text-lg font-black uppercase tracking-widest text-red-500 mb-2">Sistema Indisponível</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-center px-2">
                    Não foi possível emitir seu VIP digital. Por favor, avise a recepção apresentando esta tela.
                  </p>
                </div>
              ) : (
                <div className="bg-[#151515] border border-orange-500/30 rounded-[2rem] p-6 shadow-[0_0_30px_rgba(249,115,22,0.15)] flex flex-col items-center w-full max-w-[320px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 to-yellow-500" />
                  
                  <h3 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-4">Benefício liberado</h3>
                  
                  <div className="w-36 h-36 bg-white rounded-2xl mb-4 p-2 flex items-center justify-center">
                    <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center flex-col gap-1">
                      <QrCode size={36} className="text-gray-300" />
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider text-center px-1">QR Code<br/>Em Breve</span>
                    </div>
                  </div>

                  <div className="w-full bg-black/50 rounded-xl py-3 px-4 border border-white/5 flex items-center justify-between group">
                    <p className="text-2xl font-black text-white tracking-widest font-mono select-all">
                      {couponStatus === 'loading' ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={24} className="animate-spin text-orange-500" /> GERANDO
                        </span>
                      ) : generatedCoupon}
                    </p>
                    {couponStatus === 'success' && (
                      <button 
                        onClick={copyToClipboard}
                        className="text-white/30 hover:text-white transition-colors"
                        title="Copiar Cupom"
                      >
                        {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-3 uppercase tracking-widest font-bold">
                    Entrada promocional vinculada à sua pulseira <br/> Apresente este código na recepção
                  </p>
                </div>
              )}
            </div>

            <div className="mb-4 w-full max-w-[280px] mx-auto">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <div className={`h-full animate-progress-shrink origin-left w-full ${couponStatus === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-orange-500 to-yellow-500'}`} style={{ animationDuration: '20s' }} />
              </div>
              <button 
                onClick={resetToIdle}
                className="text-[10px] text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors"
              >
                Toque aqui para fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBraceletModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-[400px] bg-black/90 rounded-[2rem] border-[2px] border-orange-500/50 flex flex-col shadow-2xl p-6 md:p-8 text-center"
            >
              <div className="mb-6">
                <Tag size={40} className="mx-auto text-orange-500 mb-3" />
                <h2 className="text-2xl font-black uppercase text-white tracking-wider">
                  Identificação
                </h2>
                <p className="text-gray-400 mt-2 text-xs md:text-sm">Digite o número da sua pulseira para continuar</p>
              </div>

              <form onSubmit={handleBraceletSubmit} className="flex flex-col gap-5">
                <input 
                  type="text" 
                  inputMode="numeric"
                  autoFocus
                  value={bracelet}
                  onChange={(e) => setBracelet(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 1234"
                  className={`w-full bg-black/50 border-2 py-5 text-center text-3xl font-black text-orange-400 rounded-2xl outline-none transition-all placeholder:text-white/10 shadow-inner ${
                    braceletError ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-shake' : 'border-white/10 focus:border-orange-500'
                  }`}
                />
                
                {braceletError && (
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-[-10px]">
                    Pulseira não encontrada!
                  </p>
                )}
                
                <div className="flex gap-3 mt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsBraceletModalOpen(false)
                      setBracelet('')
                      setBraceletError(false)
                    }}
                    className="flex-1 py-3.5 rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/50 hover:bg-white/5 transition-all border border-white/5"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    disabled={!bracelet.trim() || isValidatingBracelet}
                    className="flex-[2] py-3.5 rounded-2xl text-[11px] md:text-sm font-black uppercase tracking-widest text-black bg-gradient-to-r from-orange-500 to-yellow-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                  >
                    {isValidatingBracelet ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 text-center text-[9px] text-white/20 uppercase tracking-widest font-medium relative z-10">
        <p>© Developed by: <span className="text-orange-500 font-bold">Matteus Tirado</span></p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  )
}