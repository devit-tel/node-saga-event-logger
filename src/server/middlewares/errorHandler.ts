import koaRouter = require('koa-router');
import * as R from 'ramda';

export default async (ctx: koaRouter.IRouterContext, next: Function) => {
  try {
    await next();
  } catch ({ isCustomError, statusCode, code, message, stack }) {
    if (isCustomError) {
      ctx.status = statusCode;
    } else {
      ctx.status = 500;
    }
    ctx.body = {
      success: false,
      data: null,
      error: {
        code,
        message,
        stack: stack,
        debug: {
          ...R.pick(['method', 'url', 'headers', 'body'], ctx.request),
          query: ctx.query,
          params: ctx.params,
        },
      },
    };
  }
};
