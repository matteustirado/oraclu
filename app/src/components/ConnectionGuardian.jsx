import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ORACLU GUARDIAN] Erro interceptado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#050505]">
          <div className="bg-[#151515] border border-red-500/30 p-10 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center max-w-sm text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white mb-3 tracking-widest uppercase">Falha de Conexão</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-6 font-medium">
              A comunicação com o servidor foi interrompida abruptamente. O sistema travou a tela para proteger seus dados.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-colors text-xs uppercase tracking-widest"
            >
              Reiniciar Sistema
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ConnectionGuardian({ children }) {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    setIsConnected(socket.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <ErrorBoundary>
      {children}
      
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0a0410]/80 backdrop-blur-xl"
          >
            <div className="bg-black/60 border border-purple-500/30 p-10 rounded-[2rem] shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col items-center max-w-sm text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 animate-pulse border border-purple-500/20 relative z-10">
                <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-widest uppercase relative z-10">Sinal Perdido</h2>
              <p className="text-purple-200/60 text-sm leading-relaxed font-medium relative z-10">
                O servidor está reiniciando ou a rede oscilou.
                <br /><br />
                <span className="text-purple-400 font-bold">Não feche esta tela.</span> Seus dados estão salvos em background e a conexão voltará sozinha.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}