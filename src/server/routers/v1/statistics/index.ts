import koaRouter = require('koa-router');
import { eventStore } from '../../../../store';
import { toNumber } from '../../../../utils/common';

export const router = new koaRouter();

router.get('/transaction/week', async (ctx: koaRouter.IRouterContext) => {
  const { status, now } = ctx.query;
  return eventStore.getWeeklyTransactionsByStatus(status, now);
});

router.get('/task/execute/week', async (ctx: koaRouter.IRouterContext) => {
  const { now } = ctx.query;
  return eventStore.getWeeklyTaskExecuteTime(now);
});

router.get('/false-events', async (ctx: koaRouter.IRouterContext) => {
  const { fromTimestamp, toTimestamp } = ctx.query;
  return eventStore.getFalseEvents(
    toNumber(fromTimestamp, 0),
    toNumber(toTimestamp, Date.now()),
  );
});
