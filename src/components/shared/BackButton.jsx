import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Root screens where back button should be hidden
const ROOT_PATHS = ['/home', '/produttore', '/staff', '/aziende', '/mercati', '/preferiti', '/ordini', '/notizie', '/stagionalita'];

export default function BackButton({ className = '', variant = 'outline' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on root paths
  if (ROOT_PATHS.includes(location.pathname)) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={() => navigate(-1)}
      className={`rounded-xl h-11 w-11 flex-shrink-0 ${className}`}
      title="Torna indietro"
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}