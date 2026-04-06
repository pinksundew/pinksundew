'use client'

import { useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2 } from 'lucide-react'

type AbyssDropZoneProps = {
  isVisible: boolean
}

export function AbyssDropZone({ isVisible }: AbyssDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'abyss-drop-zone',
    data: { type: 'AbyssDropZone' },
  })

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 20
          }}
          className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        >
          {/* A dark gradient background representing the "abyss" */}
          <div 
             className="w-full h-32 bg-gradient-to-t from-red-950 via-red-900/50 to-transparent flex items-end justify-center pb-6"
             style={{ opacity: isOver ? 0.9 : 0.6, transition: 'opacity 0.2s ease-in-out' }}
          >
             <div 
               ref={setNodeRef}
               className={`
                 pointer-events-auto
                 flex flex-col items-center justify-center overflow-hidden
                 rounded-xl border-2 transition-all duration-300 w-64 h-20 shadow-2xl
                 ${isOver 
                   ? 'border-red-400 bg-red-950/80 shadow-[0_0_40px_rgba(248,113,113,0.5)] scale-110' 
                   : 'border-red-900/50 bg-red-950/40 backdrop-blur-md'}
               `}
             >
                <div className="relative">
                   <Trash2 
                     className={`w-8 h-8 transition-colors duration-300 ${isOver ? 'text-red-400' : 'text-red-200/50'}`} 
                   />
                   {isOver && (
                     <motion.div
                       layoutId="flame"
                       initial={{ opacity: 0, scale: 0 }}
                       animate={{ opacity: 1, scale: 1.5 }}
                       className="absolute inset-0 bg-red-500/20 blur-md rounded-full"
                     />
                   )}
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest mt-2 transition-colors duration-300 ${isOver ? 'text-red-300' : 'text-red-200/50'}`}>
                  {isOver ? 'Destroy' : 'Drag here to delete'}
                </span>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
