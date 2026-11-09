'use client';
import Link from 'next/link';
import {UserRound} from 'lucide-react';
import {useAccountPresence} from './account-presence';
import styles from './StoreAccountLink.module.css';
export default function StoreAccountLink(){
  const presence=useAccountPresence();
  return <Link href="/store/account" className={styles.link}><UserRound size={17} strokeWidth={1.5} aria-hidden/><span>{presence==='signed-in'?'Your account':presence==='signed-out'?'Sign in':'Account'}</span></Link>;
}
