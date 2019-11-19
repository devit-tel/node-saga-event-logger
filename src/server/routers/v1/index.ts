import koaRouter = require('koa-router');
import * as storeRouter from './store';

export const router = new koaRouter();

router.use(
  '/store',
  storeRouter.router.routes(),
  storeRouter.router.allowedMethods(),
);
