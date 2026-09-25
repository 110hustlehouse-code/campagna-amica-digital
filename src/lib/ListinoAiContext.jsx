import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '@/api/storage';
import { invokeFunction } from '@/api/functions';

const ListinoAiContext = createContext(null);

const MILESTONES = [
  { pct: 20, step: 0, delay: 400 },
  { pct: 45, step: 1, delay: 3000 },
  { pct: 65, step: 2, delay: 8000 },
  { pct: 85, step: 3, delay: 14000 },
  { pct: 93, step: 3, delay: 22000 },
];

/**
 * Stato dell'analisi Listino AI, vissuto qui invece che nella pagina:
 * montato una sola volta a livello di ProducerLayout, sopravvive al
 * cambio pagina (Home, Prodotti, DDT...) perché il Provider non viene
 * mai smontato durante la navigazione fra le sezioni produttore.
 */
export function ListinoAiProvider({ children }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('idle'); // idle | analyzing | done | error
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const timersRef = useRef([]);

  useEffect(() => {
    if (status === 'idle') return;
    localStorage.setItem('listino-ai-state', JSON.stringify({ status, progress, activeStep, result }));
  }, [status, progress, activeStep, result]);

  useEffect(() => {
    const saved = localStorage.getItem('listino-ai-state');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.status === 'analyzing' || parsed.status === 'done') {
        setStatus(parsed.status);
        setProgress(parsed.progress);
        setActiveStep(parsed.activeStep);
        setResult(parsed.result);
      }
    } catch {}
  }, []);

  const avviaTimeline = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    setProgress(5);
    setActiveStep(0);
    timersRef.current = MILESTONES.map(({ pct, step, delay }) =>
      setTimeout(() => { setProgress(pct); setActiveStep(step); }, delay)
    );
  }, []);

  const startUpload = useCallback(async (file, companyId) => {
    if (!file || !companyId) return;
    qc.invalidateQueries({ queryKey: ['my-company'] });
    setStatus('analyzing');
    setResult(null);
    setErrorMsg('');
    avviaTimeline();

    try {
      const { file_url } = await uploadFile(file, 'allegati');

      let res, retries = 0;
      while (retries < 3) {
        try {
          res = await invokeFunction('analyzeListino', { file_url, company_id: companyId });
          break;
        } catch (err) {
          if (err.response?.status === 504 && retries < 2) {
            retries++;
            await new Promise(r => setTimeout(r, 2000));
          } else throw err;
        }
      }

      timersRef.current.forEach(clearTimeout);
      if (res.data?.error) {
        setStatus('error');
        setErrorMsg(res.data.error);
        return;
      }
      setResult(res.data);
      // Invalidato QUI, nello stesso istante in cui lo stato passa a
      // "done" — non nella pagina Listino AI, che a questo punto
      // potrebbe già essere stata smontata dal redirect automatico,
      // creando una corsa tra invalidazione e nuovo mount di Prodotti.
      qc.invalidateQueries({ queryKey: ['my-products'] });
      setStatus('done');
      setProgress(100);
      setActiveStep(3);
    } catch (err) {
      timersRef.current.forEach(clearTimeout);
      setStatus('error');
      setErrorMsg(err.message || 'Errore durante l\'analisi');
    }
  }, [avviaTimeline, qc]);

  const reset = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    setStatus('idle');
    setProgress(0);
    setActiveStep(0);
    setResult(null);
    setErrorMsg('');
    localStorage.removeItem('listino-ai-state');
  }, []);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  return (
    <ListinoAiContext.Provider value={{ status, activeStep, progress, result, errorMsg, startUpload, reset }}>
      {children}
    </ListinoAiContext.Provider>
  );
}

export function useListinoAi() {
  const ctx = useContext(ListinoAiContext);
  if (!ctx) throw new Error('useListinoAi va usato dentro ListinoAiProvider');
  return ctx;
}