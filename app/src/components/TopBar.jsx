import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Home, MonitorPlay } from 'lucide-react'

const ADMIN_ROLES = ['super', 'admin', 'adminsp', 'adminbh']
const DISPLAY_ROLES = ['surveysp', 'surveybh']

const TopBar = () => {
  const navigate = useNavigate()
  
  const userStr = localStorage.getItem('oraclu_user')
  const role = userStr ? JSON.parse(userStr).role : ''

  const handleLogout = () => {
    localStorage.removeItem('oraclu_token')
    localStorage.removeItem('oraclu_user')
    navigate('/login')
  }

  return (
    <header className="md:hidden fixed top-0 left-0 w-full z-50 px-4 pt-3 pb-2">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a0410] via-[#0a0410]/80 to-transparent" />

      <div className="liquid-glass relative mx-auto flex max-w-md items-center justify-between rounded-[2rem] px-4 py-3 shadow-[0_12px_50px_rgba(0,0,0,0.65)] overflow-hidden border border-purple-500/20 bg-black/60">
        <div className="pointer-events-none absolute -top-12 left-1/2 h-28 w-56 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl" />

        {ADMIN_ROLES.includes(role) ? (
          <button
            onClick={() => navigate('/home')}
            className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent bg-black/20 text-white/40 transition-all duration-300 hover:scale-105 hover:border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-300 active:scale-95"
          >
            <Home size={24} strokeWidth={2.5} />
          </button>
        ) : (
          <button
            onClick={() => navigate('/survey-display')}
            className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent bg-black/20 text-white/40 transition-all duration-300 hover:scale-105 hover:border-fuchsia-500/30 hover:bg-fuchsia-500/10 hover:text-fuchsia-300 active:scale-95"
          >
            <MonitorPlay size={24} strokeWidth={2.5} />
          </button>
        )}

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-700 p-1 shadow-[0_0_18px_rgba(168,85,247,0.35)]">
            <img src="/OracluIcon-App.png" alt="Oraclu" className="h-full w-full object-contain drop-shadow-md" />
          </div>
          <div className="flex flex-col leading-none">
            <h1 className="text-lg font-black tracking-tight text-white drop-shadow-md">Oraclu</h1>
            <span className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-purple-300/80">
              Dédalos
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent bg-black/20 text-white/40 transition-all duration-300 hover:scale-105 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 active:scale-95"
        >
          <LogOut size={24} strokeWidth={2.5} />
        </button>
      </div>
    </header>
  )
}

export default memo(TopBar)