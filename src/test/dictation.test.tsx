import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useDictation } from '@/hooks/use-dictation';

class Recognition {
  static current: Recognition | null = null;
  lang = ''; interimResults = false; continuous = false;
  onresult: ((event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { Recognition.current = this; }
  start() { this.onstart?.(); }
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
}
afterEach(() => { Reflect.deleteProperty(window, 'SpeechRecognition'); });
describe('Italian dictation', () => {
  it('uses it-IT and appends intermediate transcription without duplicating it', () => {
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
    const setText = vi.fn();
    const { result } = renderHook(() => useDictation('pane', setText));
    act(() => result.current.toggle());
    const rec = Recognition.current;
    expect(rec?.lang).toBe('it-IT');
    expect(rec?.interimResults).toBe(true);
    expect(result.current.listening).toBe(true);
    act(() => rec?.onresult?.({ results: [{ isFinal: false, 0: { transcript: 'lat' } }] }));
    expect(setText).toHaveBeenLastCalledWith('pane lat');
    act(() => rec?.onresult?.({ results: [{ isFinal: true, 0: { transcript: 'latte' } }] }));
    expect(setText).toHaveBeenLastCalledWith('pane latte');
    act(() => result.current.toggle());
    expect(rec?.stop).toHaveBeenCalledTimes(1);
    expect(result.current.listening).toBe(false);
  });
  it('clears active state after microphone permission is denied', () => {
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true });
    const { result } = renderHook(() => useDictation('', vi.fn()));
    act(() => result.current.toggle());
    act(() => Recognition.current?.onerror?.({ error: 'not-allowed' }));
    expect(result.current.listening).toBe(false);
    expect(result.current.error.length).toBeGreaterThan(0);
  });
});