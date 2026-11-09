import {DEMO_WILD_RATE,formatPreviewMoney,usdCentsToPreviewMoney} from './preview-currency';
import styles from './WildPriceQuote.module.css';

/** Only for explicitly simulated historical trading data, never catalog prices. */
export default function DemoWildPriceQuote({usdCents}:{usdCents:number|string}){
  return <small className={styles.quote} title={DEMO_WILD_RATE.label}>≈ {formatPreviewMoney(usdCentsToPreviewMoney(usdCents,'WILD'))}<span> · Sample rate</span></small>;
}
