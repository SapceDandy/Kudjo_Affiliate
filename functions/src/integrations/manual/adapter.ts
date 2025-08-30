import { PosAdapter } from '../posAdapter';

export const manualAdapter: PosAdapter = {
  async createPromotion(input) {
    // No external system; return deterministic id
    return { externalId: `manual_${input.dealId}` };
  },
  async disablePromotion(externalId: string) {
    return;
  },
};



