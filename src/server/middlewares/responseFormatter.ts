import koaRouter = require('koa-router');

export default async (ctx: koaRouter.IRouterContext, next: Function) => {
  const data = await next();
  ctx.body = {
    success: true,
    data,
    error: null,
  };
};
