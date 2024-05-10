import { BadRequestException, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import type { Response } from "express";
import { getReasonPhrase } from "http-status-codes";

type ValidateErrorMessage = Array<{
  field: string;
  message: Array<string>;
}>;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException | Error, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        let status = 500; // 默认http status状态错误码
        let code = 500; // 默认后端自定义错误码
        let message: string | ValidateErrorMessage = getReasonPhrase(code); // 默认错误信息

        if (exception instanceof HttpException) {
            // Nestjs预设的错误
            status = exception.getStatus();
            const results = exception.getResponse() as any;
            code = results.statusCode;
            message = results.message ?? getReasonPhrase(code);

            // 参数校验错误，默认都是BadRequestException
            const isArrayMessage = Array.isArray(results.message);
            const isValidationError =
                isArrayMessage && typeof results.message[0] === "string" && results.message[0].includes("⓿");
            if (exception instanceof BadRequestException && isValidationError) {
                const validateMessage: ValidateErrorMessage = [];
                results.message.forEach((item) => {
                    const [key, val] = item.split("⓿") as [string, string];
                    const findData = validateMessage.find((item) => item.field === key);
                    if (findData) {
                        findData.message.push(val);
                    } else {
                        validateMessage.push({ field: key, message: [val] });
                    }
                });
                message = validateMessage;
            }
        } else {
            // 其他错误
            message = exception.message ?? getReasonPhrase(code);
        }
        return response.status(status).json({
            code,
            message,
            data: null
        });
    }
}