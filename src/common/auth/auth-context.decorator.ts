import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext } from './auth-context.interface';

export const Auth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => {
    const request = context.switchToHttp().getRequest<{ auth: AuthContext }>();
    return request.auth;
  },
);
