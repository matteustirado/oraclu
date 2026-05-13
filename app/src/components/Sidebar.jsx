import { memo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Settings, LogOut, Bell, Home, MapPin } from 'lucide-react'

const SUPER_ROLES = ['super']
const ADMIN_ROLES = ['super', 'admin', 'adminsp', 'adminbh']

const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const userStr = localStorage.getItem('oraclu_user')
  const user = userStr ? JSON.parse(userStr) : null
  const role = user ? user.role : ''
  const currentUnit = user?.unit ? user.unit.toLowerCase() : 'sp'

  let navItems = []

  // Apenas a Ferramenta Principal no menu. Os sub-recursos ficam dentro dela.
  if (ADMIN_ROLES.includes(role)) {
    navItems = [
      { name: 'Editor de Pesquisa', path: '/survey-edit', icon: Settings, isReady: true }
    ]
  }

  const handleLogout = () => {
    localStorage.removeItem('oraclu_token')
    localStorage.removeItem('oraclu_user')
    navigate('/login')
  }

  const handleNavClick = (path, isReady, name) => {
    if (!isReady) {
      toast.info(`${name} chegando nas próximas atualizações! 🚧`)
      return
    }
    navigate(path)
  }

  const handleUnitChange = (newUnit) => {
    if (newUnit === currentUnit) return
    const updatedUser = { ...user, unit: newUnit.toUpperCase() }
    localStorage.setItem('oraclu_user', JSON.stringify(updatedUser))
    window.location.reload()
  }

  const isSuper = SUPER_ROLES.includes(role)
  const isHomeActive = location.pathname === '/home'

  return (
    <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 z-40 overflow-hidden border-r border-white/10 bg-black/40 backdrop-blur-3xl shadow-[12px_0_50px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-8 h-40 w-40 rounded-full bg-fuchsia-700/10 blur-3xl" />

      <div className="relative z-10 p-4">
        <div className="liquid-glass flex items-center gap-3 rounded-3xl p-4 border border-purple-500/20 bg-black/20">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-700 flex items-center justify-center shadow-[0_0_22px_rgba(168,85,247,0.35)] overflow-hidden shrink-0 p-1.5">
            <img src="/OracluIcon-App.png" alt="Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>

          <div className="flex flex-col min-w-0">
            <h1 className="text-white text-lg font-black tracking-tight leading-tight drop-shadow-md">
              Oraclu
            </h1>
            <p className="text-purple-300 text-[10px] uppercase tracking-[0.18em] font-black drop-shadow-sm">
              Análises Dédalos
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 pb-4">
        <div className="liquid-glass flex gap-2 rounded-3xl p-2 border border-white/5 bg-black/20">
          {ADMIN_ROLES.includes(role) ? (
            <button
              onClick={() => handleNavClick('/home', true, 'Início')}
              className={`flex-1 flex items-center justify-center h-12 rounded-2xl transition-all border ${
                isHomeActive
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[inset_0_0_18px_rgba(168,85,247,0.12)]'
                  : 'bg-black/25 text-white/40 border-transparent hover:bg-white/10 hover:text-purple-300 hover:border-white/15'
              }`}
              title="Início"
            >
              <Home size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={() => toast.info('Notificações em breve! 🚧')}
              className="flex-1 flex items-center justify-center h-12 rounded-2xl bg-black/25 transition-all border border-transparent text-white/40 hover:bg-white/10 hover:text-purple-300 hover:border-white/15"
              title="Notificações"
            >
              <Bell size={20} strokeWidth={2.5} />
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center h-12 rounded-2xl bg-black/25 transition-all border border-transparent text-white/40 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
            title="Sair do Sistema"
          >
            <LogOut size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {isSuper && (
        <div className="relative z-10 px-4 pb-4">
          <div className="liquid-glass rounded-3xl p-4 border border-white/5 bg-black/20">
            <div className="flex items-center gap-2 mb-3 text-white/45 text-[10px] uppercase font-black tracking-[0.18em]">
              <MapPin size={13} />
              Unidade de Operação
            </div>

            <div className="flex p-1.5 bg-black/35 rounded-2xl border border-white/10 shadow-inner">
              <button
                onClick={() => handleUnitChange('sp')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                  currentUnit === 'sp'
                    ? 'bg-purple-600 text-white shadow-[0_0_18px_rgba(168,85,247,0.35)]'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                SP
              </button>

              <button
                onClick={() => handleUnitChange('bh')}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                  currentUnit === 'bh'
                    ? 'bg-purple-600 text-white shadow-[0_0_18px_rgba(168,85,247,0.35)]'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                BH
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="relative z-10 flex-1 px-4 pb-4 overflow-y-auto custom-scrollbar">
        <div className="liquid-glass rounded-3xl p-3 space-y-2 min-h-full border border-white/5 bg-black/20">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname.startsWith(item.path)

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path, item.isReady, item.name)}
                className={`relative w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 border group overflow-hidden ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.12)]'
                    : 'border-transparent text-white/50 hover:bg-white/10 hover:text-white hover:border-white/15'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-fuchsia-400/5 to-transparent pointer-events-none" />
                )}

                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`relative z-10 transition-transform group-hover:scale-110 ${
                    isActive ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'opacity-70'
                  }`}
                />

                <p className={`relative z-10 text-sm tracking-wide ${isActive ? 'font-black' : 'font-bold'}`}>
                  {item.name}
                </p>

                {!item.isReady && (
                  <span className="relative z-10 ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase text-white/40">
                    Em breve
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="relative z-10 p-4 pt-0">
        <div className="liquid-glass rounded-3xl p-4 border border-white/5 bg-black/20">
          <div className="text-center text-[10px] text-white/30">
            <p className="font-bold tracking-widest uppercase">
              © Developed by:
              <br />
              <span className="text-purple-400/90 font-black">Matteus Tirado</span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default memo(Sidebar)