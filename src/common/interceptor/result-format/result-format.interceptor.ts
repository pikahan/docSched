import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { getReasonPhrase } from "http-status-codes";

@Injectable()
export class ResultFormatInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse<Response>();
        const code = response.statusCode;
        const message = response.statusMessage || getReasonPhrase(code);

        return next.handle().pipe(
          map((data) => {
            // 判断是否已经是格式化的数据
            if (data) {
              const hasFormat = ['code', 'message', 'data'].every(key => Object.hasOwn(data, key));
              if (hasFormat) return data;
            }

            return {
              code: code,
              message: message,
              data: data ?? null
            };
          })
        );
    }
}