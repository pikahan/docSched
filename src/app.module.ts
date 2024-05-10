import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { OptionModule } from './option/option.module';
import { WorkModule } from './work/work.module';
import { User } from './user/entity/user.entity';
import { Option } from './option/entities/option.entity';
import { Work } from './work/entities/work.entity';
import { OcrModule } from './ocr/ocr.module';
import { APP_GUARD } from '@nestjs/core';
import { LoginGuard } from './login.guard';
import { BotModule } from './bot/bot.module';
import { QqChannelModule } from './qq-channel/qq-channel.module';
import { QqChannel } from './qq-channel/entities/qq-channel.entity';
import { WinstonModule } from './winston/winston.module';
import { format, transports } from 'winston';
import * as chalk from 'chalk';
import * as WinstonDailyRotateFile from 'winston-daily-rotate-file';
import { ConfigModule, ConfigService } from '@nestjs/config';


@Module({
  imports: [
    WinstonModule.forRoot({
      level: 'debug',
      transports: [
          new transports.Console({
              format: format.combine(
                  format.colorize(),
                  format.printf(({context, level, message, time}) => {
                      const appStr = chalk.green(`[NEST]`);
                      const contextStr = chalk.yellow(`[${context}]`);
                      return `${appStr} ${time} ${level} ${contextStr} ${message} `;
                  })
              ),

          }),
          new WinstonDailyRotateFile({
            filename: 'application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            dirname: 'log',
          }),
      ]
    }),
    ConfigModule.forRoot(),
    UserModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        let username = configService.get('MYSQL_USER');
        let password = configService.get('MYSQL_PASSWORD');
        let host = configService.get('MYSQL_HOST');
        const db = configService.get('DB_DATABASE');
        return {
          type: "mysql",
          host: host,
          port: 3306,
          username: username,
          password: password,
          database: db,
          synchronize: true,
          logging: true,
          entities: [User, Option, Work, QqChannel],
          poolSize: 10,
          connectorPackage: 'mysql2',
          extra: {
              authPlugin: 'sha256_password',
          }
        }
      },
      inject: [ConfigService],
    }),
    JwtModule.register({
      global: true,
      signOptions: {
        expiresIn: '30m'
      },
      secret: 'pikahan'
    }),
    OptionModule,
    WorkModule,
    OcrModule,
    BotModule,
    QqChannelModule,
    WinstonModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: LoginGuard,
    },
    AppService,
  ],
})
export class AppModule {}
