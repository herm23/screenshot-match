import { useEffect, useRef, useState } from 'react';
import { appendTranscript } from '@/features/shopping/models';

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; onstart: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function useDictation(text: string, setText: (text: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => { recognition.current?.abort(); };
  }, []);
  const toggle = () => {
    if (recognition.current) { recognition.current.stop(); return; }
    const w = window as SpeechWindow;
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) { setError('La dettatura non è disponibile in questo browser. Puoi scrivere la spesa.'); return; }
    const rec = new Speech();
    const base = text;
    rec.lang = 'it-IT';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (event) => {
      const transcript = Array.from(event.results).map(result => result[0].transcript).join(' ');
      setText(appendTranscript(base, transcript));
    };
    rec.onstart = () => setListening(true);
    rec.onend = () => { recognition.current = null; setListening(false); };
    rec.onerror = ({ error: reason }) => {
      setListening(false);
      recognition.current = null;
      setError(reason === 'not-allowed' || reason === 'service-not-allowed' ? 'Permesso microfono negato. Abilitalo nelle impostazioni del browser oppure scrivi la spesa.' : reason === 'no-speech' ? 'Non ho sentito la tua voce. Riprova.' : reason === 'aborted' ? '' : 'La dettatura si è interrotta. Puoi riprovare o continuare a scrivere.');
    };
    setError('');
    recognition.current = rec;
    try { rec.start(); } catch { recognition.current = null; setListening(false); setError('Non riesco ad avviare il microfono. Controlla i permessi e riprova.'); }
  };
  return { supported, listening, error, toggle };
}