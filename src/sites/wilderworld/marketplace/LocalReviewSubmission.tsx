'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { accountErrorMessage, STORE_ACCOUNT_EVENT, storeAccountApi, type LocalSession } from './account-client';
import styles from './LocalReviewSubmission.module.css';

export default function LocalReviewSubmission({ productId, variantId, rating, title, body }: {
  productId: string; variantId?: string; rating: number; title: string; body: string;
}) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const currentTarget = JSON.stringify([productId, variantId, session?.user?.id]);
  const targetRef = useRef(currentTarget);
  targetRef.current = currentTarget;
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { storeAccountApi.session(controller.signal).then(value => { if (!controller.signal.aborted) setSession(value); }).catch(() => { if (!controller.signal.aborted) setSession(null); }); };
    refresh(); window.addEventListener(STORE_ACCOUNT_EVENT, refresh);
    return () => { controller.abort(); window.removeEventListener(STORE_ACCOUNT_EVENT, refresh); };
  }, []);
  useEffect(() => { setMessage(''); setError(''); setBusy(false); }, [productId, variantId, session?.user?.id]);
  if (!session || !variantId || productId.startsWith('legacy:')) return null;
  async function submit() {
    if (!session?.user || !variantId || busy) return;
    const submittedTarget = currentTarget;
    setBusy(true); setMessage(''); setError('');
    try {
      await storeAccountApi.review({ productId, variantId, rating, title, body }, session.csrfToken);
      if (targetRef.current !== submittedTarget) return;
      setMessage('Saved to your account for local moderation. It is not published and does not change the product rating.');
    } catch (error) { if (targetRef.current === submittedTarget) setError(accountErrorMessage(error)); }
    finally { if (targetRef.current === submittedTarget) setBusy(false); }
  }
  return <div className={styles.box}>
    <strong>Local account review</strong>
    {session.user ? <>
      <p>Submit as {session.user.displayName}. Test reviews stay in this local database and await moderation.</p>
      <button type="button" onClick={submit} disabled={busy || rating < 1 || !title.trim() || !body.trim()}>{busy ? 'Submitting…' : 'Submit local review'}</button>
    </> : <p><Link href="/store/account">Sign in</Link> to submit a test review to your local account.</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
