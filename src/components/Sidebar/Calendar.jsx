import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function Calendar({ selectedDate, onSelect }) {
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate ?? new Date()))
  const [direction, setDirection] = useState(1) // 1 = next, -1 = prev

  const navigate = (delta) => {
    setDirection(delta)
    setViewMonth((m) => (delta > 0 ? addMonths(m, 1) : subMonths(m, 1)))
  }

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  })
  const startPad = getDay(startOfMonth(viewMonth))

  return (
    <div className="px-3 py-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <motion.button
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          className="rounded p-1 text-gray-400 hover:text-white hover:bg-[#222] transition-colors text-xs"
          aria-label="Mês anterior"
        >
          ◀
        </motion.button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={viewMonth.toISOString()}
            initial={{ opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="text-xs font-semibold uppercase tracking-widest text-gray-300"
          >
            {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
          </motion.span>
        </AnimatePresence>

        <motion.button
          onClick={() => navigate(1)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.85 }}
          className="rounded p-1 text-gray-400 hover:text-white hover:bg-[#222] transition-colors text-xs"
          aria-label="Próximo mês"
        >
          ▶
        </motion.button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={viewMonth.toISOString()}
          initial={{ opacity: 0, x: direction * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -24 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="grid grid-cols-7 gap-y-0.5"
        >
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            return (
              <motion.button
                key={day.toISOString()}
                onClick={() => onSelect(day)}
                whileHover={!isSelected ? { scale: 1.15 } : {}}
                whileTap={{ scale: 0.9 }}
                className={[
                  'flex h-7 w-full items-center justify-center rounded text-xs transition-colors',
                  isSelected ? 'bg-[#c5a059] font-bold text-black' : '',
                  !isSelected && isToday ? 'font-bold text-[#c5a059]' : '',
                  !isSelected && !isToday
                    ? 'text-gray-300 hover:bg-[#222] hover:text-white'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {day.getDate()}
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
