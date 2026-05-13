import { memo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Settings, MapPin, Home } from 'lucide-react'

const ADMIN_ROLES = ['super', 'admin', 'adminsp', 'adminbh']

const BottomNav = () => {
  const location = useLocation()
  const currentPath = location.pathname
  const [showUnitMenu, setShowUnitMenu] = useState(false)

  const userStr = localStorage.getItem('oraclu_user')
  const user = userStr ? JSON.parse(userStr) : null
  const role = user ? user.role : ''
  const currentUnit = user?.unit ? user.unit.toLowerCase() : 'sp'

  let navItems = []

  if (ADMIN_ROLES.includes(role)) {
    navItems = [
      { name: 'Início', path: '/home', icon: Home, isReady: true },
      { name: 'Editor', path: '/survey-edit', icon: Settings, isReady: true },
    ]
  }

  if (navItems.length === 0) return null

  const handleNavClick = (e, isReady, name, isActive) => {
    if (!isReady) {
      e.preventDefault()
      toast.info(`${name} chegando nas próximas atualizações! 🚧`)
      return
    }
    if (isActive) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setShowUnitMenu(false)
  }

  const handleUnitChange = (newUnit) => {
    if (newUnit === currentUnit) {
      setShowUnitMenu(false)
      return
    }
    const updatedUser = { ...user, unit: newUnit.toUpperCase() }
    localStorage.setItem('oraclu_user', JSON.stringify(updatedUser))
    setShowUnitMenu(false)
    window.location.reload()
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 px-4 pt-3 pb-6">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0410] via-[#0a0410]/80 to-transparent" />

      {showUnitMenu && role === 'super' && (
        <div className="absolute bottom-[100%] left-0 z-50 flex w-full justify-center pb-4 animate-fade-in">
          <div className="liquid-glass mx-4 flex w-full max-w-[340px] gap-2 rounded-3xl p-2 border border-purple-500/30 shadow-[0_12px_50px_rgba(0,0,0,0.8)]">
            <button
              onClick={() => handleUnitChange('sp')}
              className={`flex-1 rounded-2xl py-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                currentUnit === 'sp'
                  ? 'bg-purple-600 text-white shadow-[0_0_18px_rgba(168,85,247,0.45)]'
                  : 'bg-black/40 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              São Paulo
            </button>
            <button
              onClick={() => handleUnitChange('bh')}
              className={`flex-1 rounded-2xl py-3 text-[10px] font-black uppercase tracking-wider transition-all ${
                currentUnit === 'bh'
                  ? 'bg-purple-600 text-white shadow-[0_0_18px_rgba(168,85,247,0.45)]'
                  : 'bg-black/40 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              Belo Horizonte
            </button>
          </div>
        </div>
      )}

      <div className="liquid-glass relative mx-auto max-w-md rounded-[2rem] px-3 py-3 border border-purple-500/20 shadow-[0_-10px_50px_rgba(0,0,0,0.65)] bg-black/60">
        <ul className="relative z-10 flex items-center justify-around">
          {role === 'super' && (
            <li className="relative flex flex-col items-center">
              <button
                onClick={() => setShowUnitMenu(!showUnitMenu)}
                className={`flex h-12 w-12 flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${
                  showUnitMenu
                    ? 'scale-110 border-purple-500/40 bg-purple-500/15 text-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.35)]'
                    : 'border-transparent bg-black/20 text-white/35 hover:scale-105 hover:bg-white/10 hover:text-white/75'
                }`}
              >
                <MapPin size={showUnitMenu ? 26 : 22} strokeWidth={showUnitMenu ? 2.5 : 2} />
                {showUnitMenu && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,1)]" />
                )}
              </button>
            </li>
          )}

          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPath === item.path || currentPath.startsWith(`${item.path}/`)

            return (
              <li key={item.path} className="relative flex flex-col items-center">
                <Link
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item.isReady, item.name, isActive)}
                  className={`relative flex h-12 w-12 flex-col items-center justify-center overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isActive
                      ? 'scale-110 border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300 shadow-[0_0_18px_rgba(217,70,239,0.35)]'
                      : 'border-transparent bg-black/20 text-white/35 hover:scale-105 hover:bg-white/10 hover:text-white/75'
                  }`}
                  title={item.name}
                >
                  {isActive && (
                    <span className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/15 via-purple-400/5 to-transparent" />
                  )}
                  <Icon size={isActive ? 26 : 22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10" />
                  {isActive && (
                    <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,1)]" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export default memo(BottomNav)