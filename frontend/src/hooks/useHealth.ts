import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';

export function useHealth() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => { setStatus('offline'); controller.abort(); }, 10_000);
    setStatus('checking');
    getHealth(controller.signal).then(() => { if (!controller.signal.aborted) setStatus('online'); })
      .catch(() => { if (!controller.signal.aborted) setStatus('offline'); })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  return { status, retry: () => setAttempt(value => value + 1) };
}
