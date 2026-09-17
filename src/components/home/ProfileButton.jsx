import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Edit2, User } from 'lucide-react';

export default function ProfileButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="rounded-full w-11 h-11 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        title={user?.full_name}
      >
        <span className="text-lg font-bold">
          {user?.full_name?.[0]?.toUpperCase() || 'U'}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-48 bg-white border border-border rounded-xl shadow-lg z-50">
          <div className="p-3 border-b border-border/20">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.full_name || 'Utente'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => {
              navigate('/profilo');
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/20 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Modifica Profilo
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}