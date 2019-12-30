import koaRouter = require('koa-router');
import { State } from '@melonade/melonade-declaration';
import { eventStore } from '../../../../store';
import { jsonTryParse, toNumber } from '../../../../utils/common';

export const router = new koaRouter();

router.get('/transaction-histogram', async (ctx: koaRouter.IRouterContext) => {
  const { statuses, fromTimestamp, toTimestamp } = ctx.query;
  return eventStore.getTransactionDateHistogram(
    toNumber(fromTimestamp, 0),
    toNumber(toTimestamp, Date.now()),
    jsonTryParse(statuses, [State.TransactionStates.Running]),
  );
});

router.get('/task-execution-time', async (ctx: koaRouter.IRouterContext) => {
  const { fromTimestamp, toTimestamp } = ctx.query;
  return eventStore.getTaskExecuteime(
    toNumber(fromTimestamp, 0),
    toNumber(toTimestamp, Date.now()),
  );
});

router.get('/false-events', async (ctx: koaRouter.IRouterContext) => {
  const { fromTimestamp, toTimestamp } = ctx.query;
  return eventStore.getFalseEvents(
    toNumber(fromTimestamp, 0),
    toNumber(toTimestamp, Date.now()),
  );
});
