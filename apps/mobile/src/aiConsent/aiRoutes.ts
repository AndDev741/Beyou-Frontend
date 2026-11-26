/**
 * The API routes whose work goes to the AI provider (the model, the embedding model or the
 * source search). The same list the server's `AiConsentInterceptor` refuses after a "no";
 * keep the two together.
 *
 * Paths are relative to the API base (`/notebook/ai/...`), the way the shared client calls them.
 */
export function sendsToAiProvider(method: string, path: string): boolean {
  if (method.toUpperCase() !== 'POST') return false;
  const p = path.split('?')[0];
  return (
    p.startsWith('/ai/agent/chats/') ||
    p === '/onboarding/suggestions' ||
    p.startsWith('/notebook/ai/') ||
    (p.startsWith('/notebook/pages/') && p.includes('/sources/')) ||
    p === '/second-brain/questions/refill' ||
    p === '/second-brain/insight/refresh' ||
    (p.startsWith('/second-brain/questions/') && p.endsWith('/answer'))
  );
}
