import {ownerPublicProof} from '@/lib/public-proof';
import {PublicProofView} from '@/components/public-proof';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:'CALBOK — Public proof'};
export default function ProofPage(){return <PublicProofView proof={ownerPublicProof()}/>;}
