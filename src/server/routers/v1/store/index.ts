import koaRouter = require('koa-router');
import { eventStore } from '../../../../store';
import { jsonTryParse, toNumber } from '../../../../utils/common';

export const router = new koaRouter();

router.get('/', async (ctx: koaRouter.IRouterContext) => {
  const { statuses, fromTimestamp, toTimestamp, from, size } = ctx.query;
  return eventStore.listTransaction(
    jsonTryParse(statuses, undefined),
    toNumber(fromTimestamp, 0),
    toNumber(toTimestamp, Date.now()),
    toNumber(from, 0),
    toNumber(size, 100),
  );
});

router.get('/:transactionId', async (ctx: koaRouter.IRouterContext) => {
  const { transactionId } = ctx.params;
  return eventStore.getTransactionData(transactionId);
});
