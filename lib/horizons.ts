export const horizons = ['15m', '1h', '4h', '24h', '7d'] as const;
export const horizonHours = {'15m': 0.25, '1h': 1, '4h': 4, '24h': 24, '7d': 168};
export const horizonLabels: Record<string, string> = {'15m': '15 minutes', '1h': '1 hour', '4h': '4 hours', '24h': '24 hours', '7d': '7 days'};
