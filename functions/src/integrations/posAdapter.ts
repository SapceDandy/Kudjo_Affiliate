export interface PosAdapter {
  createPromotion(input: {
    businessId: string;
    dealId: string;
    title: string;
    percentage: number;
    startAt?: string;
    endAt?: string;
  }): Promise<{ externalId: string }>;

  disablePromotion(externalId: string): Promise<void>;
}

export type PosProvider = 'manual' | 'square' | 'clover' | 'toast';

export interface PosAdapterFactoryArgs {
  provider: PosProvider;
}

export function getPosAdapter(args: PosAdapterFactoryArgs): PosAdapter {
  switch (args.provider) {
    case 'square':
      return require('./square/adapter').squareAdapter as PosAdapter;
    // TODO: Implement clover/toast adapters
    default:
      return require('./manual/adapter').manualAdapter as PosAdapter;
  }
}


