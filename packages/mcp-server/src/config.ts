export const config = {
  apiUrl: process.env.LOBSTER_ROLL_API_URL ?? 'https://lobsterroll-api.onrender.com',
  apiKey: process.env.LOBSTER_ROLL_API_KEY ?? '',
};

export function requireApiKey(): string {
  if (!config.apiKey) {
    throw new Error(
      'LOBSTER_ROLL_API_KEY environment variable is required. ' +
      'Set it to your Lobster Roll API key (lr_...).',
    );
  }
  return config.apiKey;
}
