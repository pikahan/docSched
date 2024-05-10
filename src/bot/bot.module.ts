import { Module, forwardRef } from '@nestjs/common';
import { AvailableIntentsEventsEnum, createOpenAPI, createWebsocket } from 'qq-guild-bot';
import { Msg, QQBotClient } from 'src/common/type/qq-bot-type';
import { OcrModule } from '../ocr/ocr.module';
import { RedisService } from '../redis/redis.service';
import { BotService } from './bot.service';
import { IMessageDIRECT, IMessageGUILD } from './IMessageEx';
import { RedisModule } from '../redis/redis.module';
import { QqChannelModule } from 'src/qq-channel/qq-channel.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Option } from 'src/option/entities/option.entity';
import { OptionModule } from '../option/option.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const QQ_BOT_TOKEN = 'QQ_BOT';
export const MSG_DIRECT_TOKEN = 'MSG_DIRECT_TOKEN';
export const MSG_GUILD_TOKEN = 'MSG_GUILD_TOKEN';

@Module({
  imports: [OcrModule, RedisModule, QqChannelModule, OptionModule, ConfigModule],
  providers: [
    BotService,
    {
      provide: QQ_BOT_TOKEN,
      async useFactory(botService: BotService, configService: ConfigService) {
        const appID = configService.get('BOT_APP_ID');
        const token = configService.get('BOT_TOKEN');
        const testConfig = {
          appID,
          token,
          intents: [AvailableIntentsEventsEnum.GUILD_MESSAGES, AvailableIntentsEventsEnum.DIRECT_MESSAGE], // 事件订阅,用于开启可接收的消息类型
          sandbox: true, // 沙箱支持，可选，默认false. v2.7.0+
        };
        // 创建 client
        const client = createOpenAPI(testConfig);
        // 创建 websocket 连接
        const ws = createWebsocket(testConfig);
        const ret = {
          client,
          ws,
        };
        await botService.initAllListener(ret);
        await new Promise(resolve => {
          // @ts-ignore
          ws.on('READY', () => {
            resolve(true);
          });
        });
        return ret;
      },
      inject: [BotService, ConfigService]
    }
  ],
})
export class BotModule {}
