import type {Metadata} from 'next';
import WilderworldLanding from '@/sites/wilderworld/Landing';

export const metadata:Metadata={title:'Discover Wilder World',description:'Explore the simulation, the city and life in Wilder World.'};

/** The original world introduction remains available through the site footer. */
export default function DiscoverWilderWorld(){return <WilderworldLanding/>;}
