import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { motion, useAnimation } from 'framer-motion'
import { User, Lock, Eye, EyeOff, LogIn, BarChart3, PieChart, Activity } from 'lucide-react'

import api from '../services/api'
import { ORACLU_PHRASES } from '../constants/phrases'

// Definindo todas as roles corretamente
const ADMIN_ROLES = ['super', 'admin', 'adminsp', 'adminbh']
const DISPLAY_ROLES = ['surveysp', 'surveybh']

export default function Login() {
  const navigate = useNavigate()
  const formControls = useAnimation()

  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [welcomeName, setWelcomeName] = useState('')
  const [showPhrases, setShowPhrases] = useState(false)
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [shuffledPhrases, setShuffledPhrases] = useState([])

  const redirectByRole = useCallback((user) => {
    if (!user) return

    // Se for administrador ou super, vai para a Home
    if (ADMIN_ROLES.includes(user.role)) {
      navigate('/home', { replace: true })
      return
    }

    // Se for usuário de loja (Tablet), vai direto para o Display
    if (DISPLAY_ROLES.includes(user.role)) {
      navigate('/survey-display', { replace: true })
      return
    }

    // Se não for nenhum dos dois, bloqueia
    toast.error('Acesso negado. Nível de permissão insuficiente.')
    localStorage.removeItem('oraclu_user')
    localStorage.removeItem('oraclu_token')
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    document.documentElement.classList.add('dark')

    const storedUser = localStorage.getItem('oraclu_user')
    const storedToken = localStorage.getItem('oraclu_token')

    if (storedUser && storedToken) {
      try {
        redirectByRole(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('oraclu_user')
        localStorage.removeItem('oraclu_token')
      }
    }
  }, [redirectByRole])

  const triggerErrorShake = () => {
    formControls.start({
      x: [0, -8, 8, -8, 8, 0],
      transition: { duration: 0.3 }
    })
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    if (!usuario.trim() || !senha) {
      toast.error('Preencha usuário e senha.')
      triggerErrorShake()
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/api/auth/login', {
        username: usuario.trim(),
        password: senha
      })

      const { token, user } = response.data

      localStorage.setItem('oraclu_token', token)
      localStorage.setItem('oraclu_user', JSON.stringify(user))

      setWelcomeName(user.username)

      const shuffled = [...ORACLU_PHRASES].sort(() => 0.5 - Math.random()).slice(0, 4)
      setShuffledPhrases(shuffled)

      setTimeout(() => {
        setShowPhrases(true)
        let currentIndex = 0

        const interval = setInterval(() => {
          currentIndex += 1
          if (currentIndex >= shuffled.length) {
            clearInterval(interval)
            redirectByRole(user)
            return
          }
          setPhraseIndex(currentIndex)
        }, 1500)
      }, 1000)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao efetuar login.')
      triggerErrorShake()
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#0a0410] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(217,70,239,0.1),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.08),transparent_36%),linear-gradient(135deg,#0a0410_0%,#130722_46%,#0a0410_100%)]" />
      <div className="pointer-events-none absolute -left-28 top-10 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <style>{`
        @keyframes slideRight {
          0% { opacity: 0; transform: translateX(-15px); }
          20% { opacity: 1; transform: translateX(0); }
          80% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(15px); }
        }
        .animate-slide-right {
          animation: slideRight 1.5s ease-in-out forwards;
        }
      `}</style>

      <main className="relative z-10 w-full max-w-[1100px] px-4 py-4 sm:px-6">
        <div className="mx-auto grid w-full grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          
          <section className="hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-white/5 p-6 shadow-2xl backdrop-blur-xl xl:p-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

              <div className="relative z-10">
                <div className="mb-4 flex flex-col items-center text-center xl:mb-6">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-600 to-indigo-700 p-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] xl:h-16 xl:w-16">
                    <img
                      src="/OracluIcon-App.png"
                      alt="Oraclu"
                      className="h-full w-full object-contain drop-shadow-md"
                    />
                  </div>
                  <h1 className="text-2xl font-black tracking-tight text-white xl:text-3xl">
                    Oraclu Análises
                  </h1>
                  <p className="mt-1 text-[10px] font-semibold text-purple-200/50 xl:text-xs">
                    O seu oráculo de dados do ecossistema Dédalos
                  </p>
                </div>

                <h2 className="mx-auto max-w-lg text-center text-3xl font-black leading-tight tracking-tight text-white xl:text-4xl">
                  Decisões baseadas em dados reais.
                </h2>

                <p className="mx-auto mt-3 max-w-sm text-center text-xs font-semibold leading-relaxed text-purple-200/50 xl:mt-4 xl:text-sm">
                  Acompanhe a satisfação, avalie o queridômetro e cruze métricas em tempo real.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:mt-8 xl:gap-4">
                  <div className="rounded-xl border border-purple-500/20 bg-black/40 p-3 backdrop-blur-xl xl:rounded-2xl xl:p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 xl:h-8 xl:w-8">
                        <Activity size={16} />
                      </div>
                      <h3 className="text-xs font-black text-white xl:text-sm">Pesquisa ao vivo</h3>
                    </div>
                    <p className="text-[9px] font-semibold leading-relaxed text-purple-200/40 xl:text-[10px]">
                      Monitore a ingestão de avaliações diretamente dos terminais.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:gap-4">
                    <div className="rounded-xl border border-purple-500/20 bg-black/40 p-3 backdrop-blur-xl xl:rounded-2xl xl:p-4">
                      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-400 xl:h-8 xl:w-8">
                        <BarChart3 size={16} />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-purple-200/50 xl:text-[10px]">
                        Queridômetro
                      </p>
                    </div>

                    <div className="rounded-xl border border-purple-500/20 bg-black/40 p-3 backdrop-blur-xl xl:rounded-2xl xl:p-4">
                      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 xl:h-8 xl:w-8">
                        <PieChart size={16} />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-purple-200/50 xl:text-[10px]">
                        Relatórios
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto flex w-full max-w-sm flex-col justify-center">
            <div className="mb-6 flex flex-col items-center lg:hidden">
              <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-purple-400/25 bg-gradient-to-br from-purple-500 via-fuchsia-600 to-indigo-700 p-2 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
                <img
                  src="/OracluIcon-App.png"
                  alt="Oraclu"
                  className="h-full w-full object-contain"
                />
              </div>
              <h1 className="mb-1 text-center text-3xl font-black tracking-tight text-white">
                Oraclu Análises
              </h1>
              <p className="max-w-xs text-center text-xs font-semibold text-purple-200/50">
                O seu oráculo de dados do ecossistema Dédalos
              </p>
            </div>

            <motion.form
              animate={formControls}
              onSubmit={handleLogin}
              className="relative w-full overflow-hidden rounded-3xl border border-purple-500/20 bg-black/40 p-5 shadow-2xl backdrop-blur-3xl sm:p-6 md:p-8"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-purple-500/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-2xl" />

              <div className="relative z-10 mb-5 hidden text-center lg:block">
                <h2 className="text-xl font-black tracking-tight text-white xl:text-2xl">
                  Acesso Restrito
                </h2>
              </div>

              <div className="relative z-10 space-y-4 xl:space-y-5">
                <div className="space-y-1.5">
                  <label className="ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-purple-200/50 xl:text-[10px]">
                    Identificação
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-300/40">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      value={usuario}
                      onChange={(event) => setUsuario(event.target.value)}
                      placeholder="Usuário"
                      autoComplete="username"
                      className="w-full rounded-xl border border-purple-500/10 bg-black/50 py-3 pl-10 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-white/20 focus:border-purple-500 focus:bg-black/70 focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 block text-[9px] font-black uppercase tracking-[0.2em] text-purple-200/50 xl:text-[10px]">
                    Senha
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-purple-300/40">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-purple-500/10 bg-black/50 py-3 pl-10 pr-10 text-sm font-black tracking-widest text-white outline-none transition placeholder:text-white/20 focus:border-purple-500 focus:bg-black/70 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 text-purple-300/40 transition hover:text-white"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 xl:text-sm"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    />
                  ) : (
                    <>
                      <LogIn size={16} />
                      Acessar
                    </>
                  )}
                </button>
              </div>
            </motion.form>

            <footer className="mt-6 text-center text-[10px] text-purple-200/30 xl:text-xs">
              <p>
                © Developed by:{' '}
                <span className="font-black text-purple-400">
                  Matteus Tirado
                </span>
              </p>
            </footer>
          </section>
        </div>
      </main>

      {welcomeName && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0a0410]/95 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-purple-400/30 bg-purple-600 p-3 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
              <img
                src="/OracluIcon-App.png"
                alt="Oraclu"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <h2 className="mb-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                Bem-vindo, {welcomeName}!
              </h2>

              {!showPhrases ? (
                <p className="flex h-10 items-center justify-center text-xs font-black uppercase tracking-widest text-purple-400 animate-pulse">
                  Descriptografando...
                </p>
              ) : (
                <div className="relative mx-auto h-10 w-72 overflow-hidden">
                  <p
                    key={phraseIndex}
                    className="animate-slide-right absolute inset-0 flex items-center justify-center text-center text-[10px] font-black uppercase leading-relaxed tracking-widest text-fuchsia-400 sm:text-xs"
                  >
                    {shuffledPhrases[phraseIndex]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}