import { Body, Controller, Get, Header, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { Public } from 'src/common/decorator/public.decorator';
import { OcrService } from './ocr.service';

@Controller('ocr')
export class OcrController {
  constructor(
    private ocrService: OcrService,
  ) {}

  @Post('generate/reminder')
  @UseInterceptors(FileInterceptor('image', {
      dest: 'uploads'
  }))
  @Header('Content-Type', 'text/calendar')
  @Header('Content-Disposition', 'attachment; filename=reminders.ics')
  async generateReminder(@Req() request: Request, @UploadedFile() image: Express.Multer.File, @Body() body) {
    console.log(image, 'image');
    return await this.ocrService.generateReminder(image.path, request.user.optionId);
    // 设置响应头
  }
}


