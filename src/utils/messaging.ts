import { browser } from 'wxt/browser';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function sendMessageWithRetry<TResp>(
  message: unknown,
  opts: { timeoutMs?: number; retries?: number; baseDelayMs?: number } = {}
): Promise<TResp> {
  const timeoutMs = opts.timeoutMs ?? 4000;
  const retries = opts.retries ?? 2;           
  const baseDelayMs = opts.baseDelayMs ?? 300; 

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timed = new Promise<TResp>((_, rej) =>
        setTimeout(() => rej(new Error('Message timeout')), timeoutMs)
      );
      const resp = browser.runtime.sendMessage(message) as Promise<TResp>;
      return await Promise.race([resp, timed]);
    } catch (err) {
      if (attempt === retries) throw err;
      await delay(baseDelayMs * Math.pow(2, attempt));
    }
  }
  throw new Error('unreachable');
}