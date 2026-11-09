import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NftRow } from './NftRow';
import type { MarketNft } from '@/lib/opensea';

const nft:MarketNft={identifier:'1',name:'Collectible',image:null,collectionSlug:'packs',contract:'0xabc',chain:'zchain',priceEth:null,traits:[]};
describe('source-aware collectible market links',()=>{
  it('does not offer an OpenSea action for Z-Chain inventory',()=>{
    render(<NftRow nft={nft} ethUsd={null} onOpen={()=>{}}/>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Browse only')).toBeInTheDocument();
  });
  it('links a configured Ethereum collectible to its external market without claiming execution',()=>{
    render(<NftRow nft={{...nft,collectionSlug:'wilderworld',chain:'ethereum'}} ethUsd={null} onOpen={()=>{}}/>);
    expect(screen.getByRole('link',{name:'View market'})).toHaveAttribute('href','https://opensea.io/assets/ethereum/0xabc/1');
  });
  it('fails closed for unknown collection bindings',()=>{
    render(<NftRow nft={{...nft,collectionSlug:'unknown',chain:'ethereum'}} ethUsd={null} onOpen={()=>{}}/>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
