import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket';

export default function ConnectionGuardian({ children }) {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
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
    <>
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
            <div className="bg-white/5 border border-purple-500/30 p-10 rounded-[2rem] shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col items-center max-w-sm text-center">
              <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 animate-pulse border border-purple-500/20">
                <svg className="w-10 h-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Sinal Perdido</h2>
              <p className="text-purple-200/60 text-sm leading-relaxed">
                O Oraclu está tentando restabelecer a conexão com o servidor. Aguarde um instante.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}