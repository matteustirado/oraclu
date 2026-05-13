import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Settings, BarChart2, Bookmark, MonitorPlay } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  
  const [user] = useState(() => {
    try {
      const userStr = localStorage.getItem('oraclu_user')
      return userStr ? JSON.parse(userStr) : null
    } catch (e) {
      return null
    }
  })

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto w-full relative h-[calc(100vh-2rem)] flex flex-col"
    >
      <div className="pointer-events-none absolute -top-12 -left-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl" />
      
      <div className="relative z-10 mb-8 mt-4 md:mt-0">
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          Olá, {user?.username || 'Gestor'}!
        </h1>
        <p className="text-purple-400 text-sm font-bold uppercase tracking-widest mt-2">
          Bem-vindo ao Hub Oraclu • Unidade {user?.unit || 'SP'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        
        <button 
          onClick={() => navigate('/survey-edit')}
          className="bg-black/40 border border-white/10 hover:border-purple-500/40 rounded-3xl p-6 text-left flex flex-col gap-4 group transition-all hover:bg-black/60 shadow-xl hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Criar Pesquisa</h2>
            <p className="text-xs text-white/40 mt-1 font-medium">Monte novos formulários para os tablets.</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/survey-presets')}
          className="bg-black/40 border border-white/10 hover:border-purple-500/40 rounded-3xl p-6 text-left flex flex-col gap-4 group transition-all hover:bg-black/60 shadow-xl hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
            <Bookmark size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Modelos Salvos</h2>
            <p className="text-xs text-white/40 mt-1 font-medium">Gerencie e ative as pesquisas criadas.</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/survey-ans')}
          className="bg-black/40 border border-white/10 hover:border-fuchsia-500/40 rounded-3xl p-6 text-left flex flex-col gap-4 group transition-all hover:bg-black/60 shadow-xl hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center border border-fuchsia-500/30 group-hover:scale-110 transition-transform">
            <BarChart2 size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Relatórios</h2>
            <p className="text-xs text-white/40 mt-1 font-medium">Veja as respostas coletadas nas lojas.</p>
          </div>
        </button>

        <button 
          onClick={() => navigate('/survey-display')}
          className="bg-black/40 border border-white/10 hover:border-fuchsia-500/40 rounded-3xl p-6 text-left flex flex-col gap-4 group transition-all hover:bg-black/60 shadow-xl hover:-translate-y-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center border border-fuchsia-500/30 group-hover:scale-110 transition-transform">
            <MonitorPlay size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Modo Display</h2>
            <p className="text-xs text-white/40 mt-1 font-medium">Abra o terminal para coleta de dados.</p>
          </div>
        </button>

      </div>
    </motion.div>
  )
}