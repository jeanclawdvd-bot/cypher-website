import {getAddress, verifyMessage, ZeroAddress} from 'ethers';
import {opaqueId} from './crypto';
import type {StoreWalletChallenge} from './types';

export const WALLET_CHALLENGE_MS=5*60*1000;
export const WALLET_LINK_STATEMENT='Link this wallet to your Wilder World local account. This signature does not authorize transactions or access to funds.';
export type WalletChallengeRecord={
  id:string;userId:string;sessionHash:string;address:string;chainId:1;origin:string;domain:string;
  nonce:string;issuedAt:string;expiresAt:string;consumedAt:string|null;
};

/** No ENS resolution or RPC is performed. Mixed-case addresses must pass EIP-55. */
export function walletAddress(value:unknown):string {
  if(typeof value!=='string'||!/^0x[0-9a-fA-F]{40}$/.test(value))throw new Error('Invalid Ethereum address.');
  const address=getAddress(value);
  if(address===ZeroAddress)throw new Error('The zero address cannot be linked.');
  return address;
}
export function walletChallengeMessage(record:WalletChallengeRecord):string {
  return `${record.domain} wants you to sign in with your Ethereum account:\n${getAddress(record.address)}\n\n${WALLET_LINK_STATEMENT}\n\nURI: ${record.origin}/store/account\nVersion: 1\nChain ID: 1\nNonce: ${record.nonce}\nIssued At: ${record.issuedAt}\nExpiration Time: ${record.expiresAt}\nRequest ID: ${record.id}\nResources:\n- urn:wilderworld:local-account:${record.userId}`;
}
export function makeWalletChallenge(input:{userId:string;sessionHash:string;address:string;url:URL},now=new Date()):WalletChallengeRecord {
  return {id:opaqueId('walletchallenge'),userId:input.userId,sessionHash:input.sessionHash,address:walletAddress(input.address).toLowerCase(),chainId:1,origin:input.url.origin,domain:input.url.host,
    nonce:opaqueId('nonce').slice(6),issuedAt:now.toISOString(),expiresAt:new Date(now.getTime()+WALLET_CHALLENGE_MS).toISOString(),consumedAt:null};
}
export function publicWalletChallenge(record:WalletChallengeRecord):StoreWalletChallenge {
  const {id,chainId,origin,domain,nonce,issuedAt,expiresAt}=record;
  return {id,address:getAddress(record.address),chainId,origin,domain,nonce,issuedAt,expiresAt,message:walletChallengeMessage(record)};
}
/** EOA proof only. ERC-1271 contract-wallet verification needs an explicit production adapter. */
export function verifyWalletChallenge(record:WalletChallengeRecord,signature:string):boolean {
  try{return verifyMessage(walletChallengeMessage(record),signature).toLowerCase()===record.address;}catch{return false;}
}
