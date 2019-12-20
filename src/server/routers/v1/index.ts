import koaRouter = require('koa-router');
import * as statisticsRouter from './statistics';
import * as storeRouter from './store';

export const router = new koaRouter();

router.use(
  '/store',
  storeRouter.router.routes(),
  storeRouter.router.allowedMethods(),
);

router.use(
  '/statistics',
  statisticsRouter.router.routes(),
  statisticsRouter.router.allowedMethods(),
);
