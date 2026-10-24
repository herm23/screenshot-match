import { describe, expect, it } from 'vitest';
import { appendTranscript, SEARCH_RADIUS, extractedItemSchema } from '@/features/shopping/models';

describe('Shopping rules', () => {
  it('searches supermarkets within approximately two kilometres', () => {
    expect(SEARCH_RADIUS).toBe(2000);
  });
  it('appends spoken products without overwriting existing text', () => {
    expect(appendTranscript('pane', 'due litri di latte')).toBe('pane due litri di latte');
  });
  it('preserves an explicitly provided quantity and optional category', () => {
    const item = extractedItemSchema.parse({ name: 'latte', quantity: '2 litri', category: 'latticini' });
    expect(item.quantity).toBe('2 litri');
    expect(item.category).toBe('latticini');
  });
  it('does not invent a quantity when none was supplied', () => {
    expect(extractedItemSchema.parse({ name: 'pane', quantity: null, category: null }).quantity).toBeNull();
  });
});