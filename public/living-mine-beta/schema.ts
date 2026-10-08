/** Wire contract for a future SwiftUI client. Economy actions, never balances. */
export interface Chamber {id:number;parent:number|null;x:number;biome:number;deposit:'coal'|'copper'|'crystal';discovery:number}
export type Building='bunkhouse'|'workshop'|'storage'|'refinery'|'depot';
export interface WorldState {version:1;seed:number;last:number;cash:number;ore:number;crystals:number;lifetime:number;miners:number;pick:number;rig:number;transport:number;shafts:number;oil:number;debt:number;debts:number;buildings:Record<Building,number>;construction:{id:Building;ends:number}|null;chambers:Chamber[];journal:{chamber:number;find:number;at:number}[];claimed:string[];decor:number;swings:number;lastSwing:number;explored:number;revision:number}
export type MineAction={type:'mine'|'haul'|'hire'|'pick'|'rig'|'transport'|'shaft'|'explore'|'debt'|'decor'}|{type:'build';id:Building}|{type:'contract';id:string};
export interface ActionRequest {requestId:string;revision:number;action:MineAction}
/** Disabled until transactional gang membership, invite expiry and roles are tested. */
export interface Gang {id:string;name:string;banner:{primary:string;mark:string};ownerId:string;members:Record<string,{role:'leader'|'foreman'|'miner';joinedAt:number}>;goal:{id:string;target:number;contributions:Record<string,number>;claimedBy:string[]};invites:Record<string,{hash:string;expiresAt:number;maxUses:number;uses:number}>}
