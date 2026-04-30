import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 获取当前登录用户信息的装饰器
 * 使用示例：
 * @CurrentUser() userId: string
 * @CurrentUser('email') email: string
 * @CurrentUser() user: { userId: string; email: string }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 如果指定了字段名，返回该字段值
    return data ? user?.[data] : user;
  },
);
