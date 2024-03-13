// Check instantiation at https://alephzero.subscan.io/extrinsic/43497779-1

import assert from 'assert';
import { lookupArchive } from "@subsquid/archive-registry";
import * as ss58 from "@subsquid/ss58";
import { toHex } from "@subsquid/util-internal-hex";
import {
  BlockHeader,
  DataHandlerContext,
  Event as _Event,
  SubstrateBatchProcessor,
  SubstrateBatchProcessorFields,
} from "@subsquid/substrate-processor";
import { Store, TypeormDatabase } from "@subsquid/typeorm-store";
import * as psp34 from "./abi/psp34";
import { Account } from "./model/generated";

export type Block = BlockHeader<Fields>
export type Event = _Event<Fields>
export type Fields = SubstrateBatchProcessorFields<typeof processor>
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>

interface Token {
  label: string;
  type: string;
  instantiatedBlock: number;
  averageBalanceCalculatedFromTimestamp: number;
}
const TOKENS: { [key: string]: Token; } = {
  '5E7HFbvv7o4zFpJxnUsJF5CNktew1T6nh3gctbkSTWGAeiMT': {
    label: 'AzeroPunks',
    type: 'PSP34',
    instantiatedBlock: 43_497_779,
    averageBalanceCalculatedFromTimestamp: 1_709_215_200_000,
  }
}
let PSP34_ADDRESSES_SS58 = [];
let PSP34_ADDRESSES = [];
for (var key in TOKENS) {
  let token: Token = TOKENS[key];
  if (token.type == 'PSP34') {
    PSP34_ADDRESSES_SS58.push(key)
    PSP34_ADDRESSES.push(toHex(ss58.decode(key).bytes))
  }
}
const SS58_PREFIX = ss58.decode(PSP34_ADDRESSES_SS58[0]).prefix;
const END_TIMESTAMP = 1_719_216_000_000;

const processor = new SubstrateBatchProcessor()
  .setDataSource({
    archive: lookupArchive('aleph-zero', {release: 'ArrowSquid'}),
    chain: {
      url: "wss://ws.azero.dev",
      rateLimit: 1_000
    }
  })
  .addContractsContractEmitted({
    contractAddress: PSP34_ADDRESSES
  })
  .setFields({
      block: {
          timestamp: true
      }
  })
  .setBlockRange({
    // 1 if lowest deployment height is unknown
    from: 43_497_779
  })

// processor.run(new TypeormDatabase({supportHotBlocks: true}), async ctx => {
//   const cheques = extractCheques(ctx);
//   const chequeUpdates = extractChequeUpdates(ctx);

//   // 1. Create new cheques
//   const newCheques = cheques.map((cheque) => {
//     return new Cheque({
//       id: cheque.id,
//       from: cheque.from,
//       to: cheque.to,
//       amount: cheque.amount,
//       tokenAddress: cheque.token_address,
//       memo: cheque.memo,
//       fee: cheque.fee,
//       status: 0,
//       recipientAzeroId: cheque.recipient_azero_id,
//       senderAzeroId: cheque.sender_azero_id,
//       createdAt: cheque.created_at,
//       updatedAt: cheque.created_at,
//     });
//   });
//   await ctx.store.insert(newCheques);

//   // 2. Update cheques
//   for (const gu of chequeUpdates) {
//     const cheque = await ctx.store.get(Cheque, gu.id);
//     if (cheque) {
//       cheque.status = gu.status;
//       cheque.updatedAt = gu.updated_at;
//       await ctx.store.save(
//         cheque
//       );
//     }
//   }
// });

// interface ChequeCreateEvent {
//   id: string;
//   from: string;
//   to: string;
//   amount: bigint;
//   token_address?: string;
//   memo?: string;
//   fee: bigint;
//   recipient_azero_id?: string;
//   sender_azero_id?: string;
//   created_at: Date;
// }

// // 1 => Collected
// // 2 => Cancelled
// interface ChequeUpdateEvent {
//   id: string;
//   status: number;
//   updated_at: Date;
// }

// function extractCheques(ctx: ProcessorContext<Store>): ChequeCreateEvent[] {
//   const cheques: ChequeCreateEvent[] = [];
//   for (const block of ctx.blocks) {
//     assert(block.header.timestamp, `Block ${block.header.height} had no timestamp`)
//     for (const event of block.events) {
//       if (
//         event.name === "Contracts.ContractEmitted" &&
//         event.args.contract === AZERO_PUNKS_CONTRACT_ADDRESS
//       ) {
//         const decodedEvent = psp34.decodeEvent(event.args.data);
//         if (decodedEvent.__kind === "Create") {
//           const cheque: ChequeCreateEvent = {
//             id: String(decodedEvent.id),
//             from: ss58.codec(SS58_PREFIX).encode(decodedEvent.from),
//             to: ss58.codec(SS58_PREFIX).encode(decodedEvent.to),
//             amount: decodedEvent.amount,
//             token_address: undefined,
//             memo: decodedEvent.memo,
//             fee: decodedEvent.fee,
//             recipient_azero_id: decodedEvent.recipientAzeroId,
//             sender_azero_id: decodedEvent.senderAzeroId,
//             created_at: new Date(block.header.timestamp)
//           };
//           if (decodedEvent.tokenAddress) {
//             cheque.token_address = ss58.codec(SS58_PREFIX).encode(decodedEvent.tokenAddress)
//           }
//           cheques.push(cheque);
//         }
//       }
//     }
//   }
//   return cheques;
// }

// function extractChequeUpdates(ctx: ProcessorContext<Store>): ChequeUpdateEvent[] {
//   const chequeUpdateEvents: ChequeUpdateEvent[] = [];
//   for (const block of ctx.blocks) {
//     assert(block.header.timestamp, `Block ${block.header.height} had no timestamp`)
//     for (const event of block.events) {
//       if (
//         event.name === "Contracts.ContractEmitted" &&
//         event.args.contract === AZERO_PUNKS_CONTRACT_ADDRESS
//       ) {
//         const decodedEvent = psp34.decodeEvent(event.args.data);
//         if (decodedEvent.__kind === "Cancel") {
//           chequeUpdateEvents.push({
//             id: String(decodedEvent.id),
//             status: 2,
//             updated_at: new Date(block.header.timestamp),
//           });
//         } else if (decodedEvent.__kind === "Collect") {
//           chequeUpdateEvents.push({
//             id: String(decodedEvent.id),
//             status: 1,
//             updated_at: new Date(block.header.timestamp),
//           });
//         }
//       }
//     }
//   }
//   return chequeUpdateEvents;
// }
