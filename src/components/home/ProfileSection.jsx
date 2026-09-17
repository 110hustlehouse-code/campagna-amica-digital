import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Edit2, X } from 'lucide-react';
import { useState as useStateLocal } from 'react';

export default function ProfileSection() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: formData.full_name,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="mb-8">
      <Card className="border border-border/40 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-5">
          {!isEditing ? (
            <>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-foreground text-lg">
                    {user?.full_name || 'Utente'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-5">
                <Button
                  to="/profilo"
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  Modifica Profilo
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  size="icon"
                  className="text-sm"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome completo"
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex-1 text-sm"
                >
                  {isSaving ? 'Salvataggio...' : 'Salva'}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({ full_name: user?.full_name || '' });
                  }}
                  variant="outline"
                  size="icon"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}