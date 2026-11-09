import Link from 'next/link';
import {reviewSubjectPresentation} from '@/sites/wilderworld/marketplace/review-subjects';

export default function ReviewSubject({productId,variantId}:{productId:string;variantId:string}){
  const subject=reviewSubjectPresentation(productId,variantId);
  return <>{subject.href?<Link href={subject.href}>{subject.name}</Link>:<span>{subject.name}</span>}{subject.variantLabel&&<span> · {subject.variantLabel}</span>}</>;
}
