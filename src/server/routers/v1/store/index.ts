import koaRouter = require('koa-router');
import { eventStore } from '../../../../store';
import { jsonTryParse, toNumber } from '../../../../utils/common';

export const router = new koaRouter();

router.get('/', async (ctx: koaRouter.IRouterContext) => {
  const {
    tags,
    fromTimestamp,
    toTimestamp,
    from,
    size,
    transactionId,
  } = ctx.query;
  return eventStore.listTransaction(
    toNumber(fromTimestamp, 0),
    toNumber(toTimestamp, Date.now()),
    transactionId,
    jsonTryParse(tags, []),
    toNumber(from, 0),
    toNumber(size, 100),
  );
});

router.get('/:transactionId', async (ctx: koaRouter.IRouterContext) => {
  const { transactionId } = ctx.params;
  return eventStore.getTransactionData(transactionId);
});
