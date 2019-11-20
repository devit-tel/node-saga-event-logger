import koaRouter = require('koa-router');
import { State } from '@melonade/melonade-declaration';
import { eventStore } from '../../../../store';
import { jsonTryParse, toNumber } from '../../../../utils/common';

export const router = new koaRouter();

router.get('/', async (ctx: koaRouter.IRouterContext) => {
  const {
    statuses,
    fromTimestamp,
    toTimestamp,
    from,
    size,
    transactionId,
  } = ctx.query;
  return eventStore.listTransaction(
    jsonTryParse(statuses, [
      State.TransactionStates.Cancelled,
      State.TransactionStates.Compensated,
      State.TransactionStates.Completed,
      State.TransactionStates.Failed,
      State.TransactionStates.Paused,
      State.TransactionStates.Running,
    ]),
    toNumber(fromTimestamp, 0),
    toNumber(toTimestamp, Date.now()),
    transactionId,
    toNumber(from, 0),
    toNumber(size, 100),
  );
});

router.get('/:transactionId', async (ctx: koaRouter.IRouterContext) => {
  const { transactionId } = ctx.params;
  return eventStore.getTransactionData(transactionId);
});
