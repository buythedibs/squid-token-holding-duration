// Check instantiation at https://alephzero.subscan.io/extrinsic/43497779-1

import assert from 'assert';
import { lookupArchive } from "@subsquid/archive-registry";
import * as ss58 from "@subsquid/ss58";
import { decodeHex, toHex } from "@subsquid/util-internal-hex";
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
const PSP34_ADDRESSES_SS58 = [];
const PSP34_ADDRESSES: string[] = [];
for (const key in TOKENS) {
  const token: Token = TOKENS[key];
  if (token.type == 'PSP34') {
    PSP34_ADDRESSES_SS58.push(key)
    PSP34_ADDRESSES.push(toHex(ss58.decode(key).bytes))
  }
}
const SS58_PREFIX = ss58.decode(PSP34_ADDRESSES_SS58[0]).prefix;
const END_TIMESTAMP = 1_719_216_000_000;
const MULTIPLICATION_FACTOR = 1_000_000_000_000;

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
    from: 43_497_779,
  })

processor.run(new TypeormDatabase({supportHotBlocks: true}), async ctx => {
  const transfers = extractTransferEvents(ctx);

  // 1. Create or update accounts
  for (const transfer of transfers) {
    const tokenDetails: Token = TOKENS[transfer.token];
    if (transfer.from) {
      const fromAccount = await ctx.store.get(Account, transfer.token + transfer.from);
      if (fromAccount) {
        fromAccount.balance -= transfer.amount;
        fromAccount.updatedAt = transfer.updated_at;
        fromAccount.averageBalance = calculateRunningAverage(fromAccount.averageBalance, fromAccount.balance + transfer.amount, fromAccount.balance, fromAccount.updatedAt, tokenDetails.averageBalanceCalculatedFromTimestamp);
        await ctx.store.save(
          fromAccount
        );
      }
    }
    let toAccount = await ctx.store.get(Account, transfer.token + transfer.to);
    if (toAccount) {
      toAccount.balance += transfer.amount
      toAccount.updatedAt = transfer.updated_at
    } else {
      toAccount = new Account({
        id: transfer.token + transfer.to,
        wallet: transfer.to,
        token: transfer.token,
        balance: transfer.amount,
        averageBalance: BigInt(0),
        updatedAt: transfer.updated_at,
      });
    }
    toAccount.averageBalance = calculateRunningAverage(toAccount.averageBalance, toAccount.balance - transfer.amount, toAccount.balance, toAccount.updatedAt, tokenDetails.averageBalanceCalculatedFromTimestamp);
    await ctx.store.save(
      toAccount
    );
  }
});

interface TransferEvent {
  token: string;
  from?: string;
  to: string;
  amount: bigint;
  updated_at: bigint;
}

function calculateRunningAverage(average: bigint, oldBalance: bigint, newBalance: bigint, newUpdatedAt: bigint, startTime: number) {
  const totalTime: bigint = BigInt(END_TIMESTAMP - startTime);
  const bMultiplicationFactor: bigint = BigInt(MULTIPLICATION_FACTOR);
  const timeLeft: bigint = BigInt(END_TIMESTAMP) - newUpdatedAt;
  const amountToRemove: bigint = bMultiplicationFactor * oldBalance * timeLeft / totalTime;
  average -= amountToRemove;
  const amountToAdd: bigint = bMultiplicationFactor * newBalance * timeLeft / totalTime
  return average + amountToAdd
}

function extractTransferEvents(ctx: ProcessorContext<Store>): TransferEvent[] {
  const transfers: TransferEvent[] = [];
  for (const block of ctx.blocks) {
    assert(block.header.timestamp, `Block ${block.header.height} had no timestamp`)
    for (const event of block.events) {
      if (block.header.timestamp < END_TIMESTAMP) {
        if (
          event.name === "Contracts.ContractEmitted" &&
          PSP34_ADDRESSES.includes(event.args.contract)
        ) {
          const decodedEvent = psp34.decodeEvent(event.args.data);
          if (decodedEvent.__kind === "Transfer" && decodedEvent.to) {
            const cheque: TransferEvent = {
              token: ss58.codec(SS58_PREFIX).encode(decodeHex(event.args.contract)),
              from: undefined,
              to: ss58.codec(SS58_PREFIX).encode(decodedEvent.to),
              amount: BigInt(1),
              updated_at: BigInt(block.header.timestamp)
            };
            if (decodedEvent.from) {
              cheque.from = ss58.codec(SS58_PREFIX).encode(decodedEvent.from)
            }
            transfers.push(cheque);
          }
        }
      }
    }
  }
  return transfers;
}
