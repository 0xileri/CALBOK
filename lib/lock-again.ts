import type {Receipt} from './db';
import {profileOutcome} from './caller-profiles';
import {parseGmgnAssetId,tatumAssets,type Asset} from './assets';
import {draftFields,type DraftFields} from './draft-fields';

export function lockAgainSeed(receipt:Receipt):{fields:DraftFields;asset:Asset}|null {
  if(!['won','lost','neutral'].includes(profileOutcome(receipt)))return null;
  const token=parseGmgnAssetId(receipt.asset);
  const asset:Asset|undefined=token?{id:receipt.asset,symbol:receipt.asset_symbol||token.address,name:receipt.asset_symbol||token.address,provider:'GMGN',...token}:tatumAssets(receipt.asset).find(row=>row.id===receipt.asset);
  if(!asset)return null;
  const fields=draftFields.parse({caller:receipt.caller,text:receipt.text,asset:receipt.asset,direction:receipt.direction,horizon:receipt.horizon,sourceUrl:receipt.source_url});
  return {fields,asset};
}
