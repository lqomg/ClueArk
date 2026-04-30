import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应数据格式
 */
export interface Response<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 响应拦截器 - 统一返回格式
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果返回的数据已经包含 code 字段，说明已经是统一格式，直接返回
        if (data && typeof data === 'object' && 'code' in data) {
          return data;
        }

        // 否则包装成统一格式
        return {
          code: 200,
          data: data,
          message: 'success',
        };
      }),
    );
  }
}
