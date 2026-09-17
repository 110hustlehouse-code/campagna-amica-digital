import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPE_COLORS = {
  closure: 'bg-red-500',
  special_opening: 'bg-green-500',
  event: 'bg-blue-500',
};

export default function StaffCalendar({ messages = [], onDateSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = getDay(monthStart);
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getMessagesForDate = (date) => {
    return messages.filter(msg => 
      isSameDay(new Date(msg.event_date), date)
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  return (
    <div className="bg-white rounded-2xl border border-border/50 p-6">
      {/* Header con navigazione */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-bold text-foreground">
          {format(currentDate, 'MMMM yyyy', { locale: it })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Griglia calendario */}
      <div className="space-y-2">
        {/* Intestazioni giorni */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayLabels.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Giorni del mese */}
        <div className="grid grid-cols-7 gap-1">
          {emptyDays.map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square" />
          ))}
          {daysInMonth.map(day => {
            const dayMessages = getMessagesForDate(day);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toString()}
                onClick={() => onDateSelect(day)}
                className={`aspect-square p-1 rounded-lg border-2 transition-all text-left text-xs font-semibold ${
                  isToday
                    ? 'border-primary/50 bg-primary/10'
                    : dayMessages.length > 0
                    ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
                    : 'border-border/30 bg-background hover:border-border/50'
                }`}
              >
                <div className="text-foreground mb-0.5">{format(day, 'd')}</div>
                <div className="flex gap-0.5 flex-wrap">
                  {dayMessages.slice(0, 3).map((msg, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[msg.type]}`}
                      title={msg.title}
                    />
                  ))}
                  {dayMessages.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">+{dayMessages.length - 3}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda tipi */}
      <div className="mt-6 pt-4 border-t border-border/30 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-muted-foreground">Chiusura</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-muted-foreground">Apertura speciale</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-xs text-muted-foreground">Evento</span>
        </div>
      </div>
    </div>
  );
}