import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'react-toastify/dist/ReactToastify.css'

import ConnectionGuardian from './components/ConnectionGuardian'
import MainLayout from './components/MainLayout'

const Login = lazy(() => import('./pages/Login'))
const Home = lazy(() => import('./pages/Home'))
const SurveyDisplay = lazy(() => import('./pages/SurveyDisplay'))
const SurveyEdit = lazy(() => import('./pages/SurveyEdit'))
const SurveyPresets = lazy(() => import('./pages/SurveyPresets'))
const SurveyAns = lazy(() => import('./pages/SurveyAns'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
})

function ScrollManager() {
  const location = useLocation()

  useEffect(() => {
    let timeoutId
    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(`scroll_pos_${location.pathname}`, window.scrollY.toString())
      }, 150)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [location.pathname])

  useEffect(() => {
    const savedPosition = sessionStorage.getItem(`scroll_pos_${location.pathname}`)
    if (savedPosition) {
      setTimeout(() => window.scrollTo(0, parseInt(savedPosition, 10)), 10)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname])

  return null
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userStr = localStorage.getItem('oraclu_user')
  
  if (!userStr) return <Navigate to="/login" replace />
  
  let user
  try {
    user = JSON.parse(userStr)
  } catch {
    return <Navigate to="/login" replace />
  }
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConnectionGuardian>
          <ScrollManager />
          
          <ToastContainer
            position="top-center"
            autoClose={3000}
            hideProgressBar
            theme="dark"
            toastClassName="mx-4 mt-4 bg-[#1a0b2e]/80 backdrop-blur-lg text-purple-50 font-bold border border-purple-500/30 rounded-2xl shadow-2xl"
          />

          <Suspense fallback={<div className="min-h-screen bg-[#0a0410]" />}>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              
              {/* Display isolado (Kiosk Mode) - Liberado para usuários das lojas e admins */}
              <Route path="/survey-display" element={
                <ProtectedRoute allowedRoles={['super', 'admin', 'adminsp', 'adminbh', 'surveysp', 'surveybh']}>
                  <SurveyDisplay />
                </ProtectedRoute>
              } />
              
              {/* Rotas Administrativas envelopadas pelo MainLayout */}
              <Route element={<MainLayout />}>
                
                <Route path="/home" element={
                  <ProtectedRoute allowedRoles={['super', 'admin', 'adminsp', 'adminbh']}>
                    <Home />
                  </ProtectedRoute>
                } />

                <Route path="/survey-edit" element={
                  <ProtectedRoute allowedRoles={['super', 'admin', 'adminsp', 'adminbh']}>
                    <SurveyEdit />
                  </ProtectedRoute>
                } />

                <Route path="/survey-presets" element={
                  <ProtectedRoute allowedRoles={['super', 'admin', 'adminsp', 'adminbh']}>
                    <SurveyPresets />
                  </ProtectedRoute>
                } />

                <Route path="/survey-ans" element={
                  <ProtectedRoute allowedRoles={['super', 'admin', 'adminsp', 'adminbh']}>
                    <SurveyAns />
                  </ProtectedRoute>
                } />

              </Route>

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </ConnectionGuardian>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App