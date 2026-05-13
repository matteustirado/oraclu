import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen text-white bg-[#0a0410] relative overflow-hidden">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] md:w-[30%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] md:w-[30%] h-[40%] bg-fuchsia-900/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="z-40">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto pt-24 pb-28 px-4 md:pt-8 md:p-8 relative z-10 custom-scrollbar">
          <Outlet />
        </main>
        
        <BottomNav />
      </div>
    </div>
  )
}