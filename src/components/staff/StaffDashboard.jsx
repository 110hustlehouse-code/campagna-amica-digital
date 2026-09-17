import React from 'react';
import { Bell, Calendar, AlertTriangle } from 'lucide-react';
import { isAfter, isBefore, addDays, startOfToday } from 'date-fns';

export default function StaffDashboard({ messages }) {
  const today = startOfToday();
  const weekFromNow = addDays(today, 7);

  // Comunicazioni attive (pubblicate)
  const activeMessages = messages.filter(msg => msg.is_published).length;

  // Prossimi eventi (event type, con event_date >= oggi)
  const upcomingEvents = messages.filter(msg => 
    msg.type === 'event' && 
    isAfter(new Date(msg.event_date), addDays(today, -1))
  ).length;

  // Chiusure imminenti (closure type, nei prossimi 7 giorni)
  const upcomingClosures = messages.filter(msg => 
    msg.type === 'closure' && 
    isAfter(new Date(msg.event_date), addDays(today, -1)) &&
    isBefore(new Date(msg.event_date), addDays(weekFromNow, 1))
  ).length;

  const statCards = [
    {
      label: 'Comunicazioni Attive',
      value: activeMessages,
      icon: Bell,
      color: 'from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Prossimi Eventi',
      value: upcomingEvents,
      icon: Calendar,
      color: 'from-green-50 to-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Chiusure (7 giorni)',
      value: upcomingClosures,
      icon: AlertTriangle,
      color: 'from-red-50 to-red-100',
      iconColor: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statCards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div 
            key={idx} 
            className={`bg-gradient-to-br ${card.color} rounded-xl border border-border/50 p-6 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {card.value}
                </p>
              </div>
              <Icon className={`w-10 h-10 ${card.iconColor} opacity-20`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}