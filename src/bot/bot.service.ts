import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { AvailableIntentsEventsEnum, createOpenAPI, createWebsocket } from 'qq-guild-bot';
import { Msg, QQBotClient } from 'src/common/type/qq-bot-type';
import { OcrService } from 'src/ocr/ocr.service';
import { Option } from 'src/option/entities/option.entity';
import { OptionService } from 'src/option/option.service';
import { QqChannelService } from 'src/qq-channel/qq-channel.service';
import { EntityManager, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { MSG_DIRECT_TOKEN, MSG_GUILD_TOKEN } from './bot.module';
import { findOpts, IMessageDIRECT, IMessageGUILD } from './IMessageEx';

type PromiseRet<T> = T extends Promise<infer R> ? R : any;

@Injectable()
export class BotService {
  private ws: QQBotClient['ws'];
  private client: QQBotClient['client'];
  private meId: string;
  private msgDirectFactory: (msg: Msg['msg']) => IMessageDIRECT;
  private msgGuildFactory: (msg: Msg['msg']) => IMessageGUILD;

  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    @Inject(OcrService) private ocrService: OcrService,
    private redis: RedisService,
    private qqChannelService: QqChannelService,
    private optionService: OptionService,
  ) {}

  async bindQQToken(userId: string, channelId: string, token: string) {
    return this.qqChannelService.update(userId, {
      channelId,
      qqBotToken: token,
    });
  }

  async updateWorks(schedId: number, workList: { name: string; workStartTime?: string; }[]) {
    const optionId = await this.getOptionId(schedId);
    return this.optionService.update(optionId, {
      works: workList,
    });
  }

  async getOptionId(schedId: number) {
    return this.entityManager.findOne(Option, {
      where: {
        qqChannel: {
          id: schedId,
        }
      },
      relations: {
        works: true,
      }
    }).then(option => option.id);
  }

  async getOptionInfo(schedId: number) {
    return this.entityManager.findOne(Option, {
      where: {
        qqChannel: {
          id: schedId,
        }
      },
      relations: {
        works: true,
      }
    });
  }

  async initAllListener(client: {
    ws: ReturnType<typeof createWebsocket>,
    client: ReturnType<typeof createOpenAPI>,
  }) {
    this.ws = client.ws as any;
    this.client = client.client;
    this.meId = await client.client.meApi.me().then(res => res.data.id);
    const service = {
      client: client.client,
      redis: this.redis,
      botService: this,
    };
    this.msgDirectFactory = (msg: Msg['msg']) => new IMessageDIRECT(service, msg);
    this.msgGuildFactory = (msg: Msg['msg']) => new IMessageGUILD(service, msg);
    [AvailableIntentsEventsEnum.GUILD_MESSAGES, AvailableIntentsEventsEnum.DIRECT_MESSAGE].map(type => {
      this.ws.on(type, async data => {
        data.eventRootType = type;
        this.eventRec(data);
      });
    });
  }

  async executeChannel(msg: IMessageDIRECT | IMessageGUILD) {
    try {
        this.redis.set(`latestMsgId`, msg.id, 4 * 60);
        // if (adminId.includes(msg.author.id) && !devEnv && (await redis.get("devEnv"))) return;
        if (msg instanceof IMessageGUILD && msg.mentions?.find(v => v.bot && v.id != this.meId && !msg.mentions?.find(m => m.id == this.meId))) return;

        const opt = await findOpts(msg);
        if (!opt) return;

        let schedId = await this.redis.get(`user_id:${msg.author.id}:${msg.channel_id}`);
        if (!schedId) {
          const user = await this.qqChannelService.findOneOrCreate(msg.author.id, msg.channel_id);
          schedId = `${user.id}`;
          await this.redis.set(`user_id:${msg.author.id}:${msg.channel_id}`, schedId);
        }
        msg.result = opt.result;
        msg.schedId = +schedId;

        // if (await isBan(msg)) return;
        // if (await this.redis.sIsMember(`ban:opt:guild`, `${opt.path}:${opt.keyChild}:${msg.guild_id}`))
            // return msg.sendMsgExRef({ content: `命令 ${opt.path} ${opt.keyChild} 在该频道未启用` });

        // if (global.devEnv) log.debug(`${_path}/src/plugins/${opt.path}:${opt.fnc}`);
        const plugin = await import(`./commands/${opt.path}.js`);
        if (typeof plugin[opt.fnc] !== "function") {
          // log.error(`not found function ${opt.fnc}() at "${global._path}/src/plugins/${opt.path}.ts"`)
        }else {
          await (plugin[opt.fnc])(msg);
        }

        // await pushToDB("executeRecord", {
        //     mid: msg.id,
        //     type: String(Object.getPrototypeOf(msg).constructor.name),
        //     optFather: opt.path,
        //     optChild: opt.fnc,
        //     gid: msg.guild_id,
        //     cid: msg.channel_id,
        //     cName: (msg as IMessageGUILD).channelName || "",
        //     aid: msg.author.id,
        //     aName: msg.author.username,
        //     seq: msg.seq,
        //     ts: msg.timestamp,
        //     content: msg.content,
        // });
    } catch (err) {
      console.error(err);
        // await mailerError(msg, err instanceof Error ? err : new Error(stringifyFormat(err)))
        //     .catch(err => log.error(err));
    }
  }

  async initPlan() {

  }

  async eventRec<T>(event: Msg) {
    switch (event.eventRootType) {
        case AvailableIntentsEventsEnum.GUILD_MESSAGES:
        case AvailableIntentsEventsEnum.PUBLIC_GUILD_MESSAGES: {
            const data = event.msg;
            if (!['AT_MESSAGE_CREATE', 'MESSAGE_CREATE'].includes(event.eventType)) {
              return;
            }
            // if (global.devEnv && !adminId.includes(data.author.id)) return;
            // if (devEnv) log.debug(event);
            const msg = this.msgGuildFactory(data);
            // msg.content = msg.content.replaceAll("@彩奈", "<@!5671091699016759820>");
            // if (botType == "AronaBot") import("./plugins/AvalonSystem").then(e => e.avalonSystem(msg)).catch(err => mailerError(data, err));
            return this.executeChannel(msg);
        }

        case AvailableIntentsEventsEnum.DIRECT_MESSAGE: {
            if (event.eventType != 'DIRECT_MESSAGE_CREATE') return;
            const data = event.msg;
            // if (global.devEnv && !adminId.includes(data.author.id)) return;
            // if (devEnv) log.debug(event);
            const msg = this.msgDirectFactory(data);
            await this.redis.hSet(`directUid->Gid:${this.meId}`, msg.author.id, msg.guild_id);
            return this.executeChannel(msg).catch(err => console.error(err));
        }

        // case AvailableIntentsEventsEnum.GROUP: {
        //     if (event.eventType == IntentEventType.GROUP_AT_MESSAGE_CREATE) {
        //         const data = event.msg as any as IntentMessage.GROUP_MESSAGE_body;
        //         if (devEnv && !adminId.includes(data.author.id)) return;
        //         if (devEnv) log.debug(event);
        //         const msg = new IMessageGROUP(data);
        //         return executeChat(msg);
        //     } else if ([IntentEventType.GROUP_DEL_ROBOT, IntentEventType.GROUP_ADD_ROBOT].includes(event.eventType)) {
        //         const data = event.msg as IntentMessage.GROUP_ROBOT;
        //         log.info(`已被 ${data.op_member_openid} ${event.eventType} 群聊 ${data.group_openid}`);
        //     }
        //     return;
        // }
        // case AvailableIntentsEventsEnum.GUILDS: {
        //     const data = ["GUILD_CREATE", "GUILD_UPDATE"].includes(event.eventType) ?
        //         (event.msg as IGuild) :
        //         (["CHANNEL_CREATE", "CHANNEL_UPDATE"].includes(event.eventType) ? (event.msg as IChannel) : null);
        //     if (!data) return;
        //     log.mark(`重新加载频道树中: ${event.eventType} ${data.name}(${data.id})`);
        //     return loadGuildTree(data).then(() => {
        //         log.mark(`频道树部分加载完毕`);
        //     }).catch(err => {
        //         log.error(`频道树部分加载失败`, err);
        //     });
        // }
        // case AvailableIntentsEventsEnum.GUILD_MEMBERS: {
        //     if (botType != "AronaBot") return;
        //     import("./plugins/admin").then(module => module.updateEventId(event as IntentMessage.GUILD_MEMBERS)).catch(err => log.error(err));
        //     if (devEnv) return;
        //     const msg = (event as IntentMessage.GUILD_MEMBERS).msg;
        //     if (msg.user.id != "15874984758683127001") return pushToDB("GUILD_MEMBERS", {
        //         type: event.eventType,
        //         eId: event.eventId,
        //         aId: msg.user.id,
        //         aAvatar: msg.user.avatar,
        //         aName: msg.user.username,
        //         nick: msg.nick,
        //         gid: msg.guild_id,
        //         jts: msg.joined_at,
        //         cts: new Date().toDBString(),
        //         opUserId: msg.op_user_id || "",
        //         roles: (msg.roles || []).join() || "",
        //     });
        //     else return;
        // }

        // case AvailableIntentsEventsEnum.GUILD_MESSAGE_REACTIONS: {
        //     if (botType != "AronaBot") return;
        //     const msg = (event as IntentMessage.GUILD_MESSAGE_REACTIONS).msg;
        //     if (global.devEnv && !adminId.includes(msg.user_id)) return;
        //     await import("./plugins/roleAssign").then(module => module.roleAssign(event as IntentMessage.GUILD_MESSAGE_REACTIONS)).catch(err => {
        //         log.error(err);
        //         log.error(event);
        //         return sendToAdmin(
        //             `roleAssign 失败` +
        //             `\n用户: ${msg.user_id}` +
        //             `\n频道: ${saveGuildsTree[msg.guild_id].name}(${msg.guild_id})` +
        //             `\n子频道: ${saveGuildsTree[msg.guild_id]?.channels[msg.channel_id]?.name}(${msg.channel_id})` +
        //             `\n目标消息: ${msg.target.id} -> ${msg.target.type}` +
        //             `\n表情: ${msg.emoji.type == 2 ? emojiMap[msg.emoji.id] : `<emoji:${msg.emoji.id}>`}(${msg.emoji.id}) -> ${msg.emoji.type}`
        //         );
        //     }).catch(() => { });

        //     await pushToDB("GUILD_MESSAGE_REACTIONS", {
        //         cid: msg.channel_id,
        //         emojiId: msg.emoji.id,
        //         emojiType: msg.emoji.type,
        //         gid: msg.guild_id,
        //         targetId: msg.target.id,
        //         targetType: msg.target.type,
        //         aid: msg.user_id,
        //     }).catch(err => {
        //         log.error(err);
        //         return sendToAdmin(`error: pushToDB GUILD_MESSAGE_REACTIONS`);
        //     }).catch(() => { });

        //     if (adminId.includes(msg.user_id) && msg.emoji.id == "55" && msg.emoji.type == 1) return client.messageApi.deleteMessage(msg.channel_id, msg.target.id).catch(err => {
        //         log.error(err);
        //     });
        // }

        // case AvailableIntentsEventsEnum.FORUMS_EVENT: {
        //     const { eventId, msg } = event as IntentMessage.FORUMS_EVENT;
        //     const aid = msg.author_id;
        //     const uidMatch = /:(?<uid>\d+)_/.exec(eventId)?.groups;
        //     if (!aid || !uidMatch || !uidMatch.uid || uidMatch.uid == "0") return;

        //     await redis.hSet("guild:aid->uid", aid, uidMatch.uid);
        //     break;
        // }
        // case AvailableIntentsEventsEnum.INTERACTION: {
        //     // if (devEnv) log.debug(event);
        //     // const { msg } = event as IntentMessage.INTERACTION;

        //     // await client.interactionApi.putInteraction(msg.id, { code: 0 }).then(data => {
        //     //     log.debug(data.data);
        //     // }).catch(err => {
        //     //     log.error(err);
        //     // }); //  0成功,1操作失败,2操作频繁,3重复操作,4没有权限,5仅管理员操作


        //     break;
        // }
    }
  }

  async generateReminder(schedId: number, imagePath: string) {
    const optionId = await this.getOptionId(schedId);
    return this.ocrService.generateReminder(imagePath, optionId);
  }
}
