import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserType {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  isSuperAdmin?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserType => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
