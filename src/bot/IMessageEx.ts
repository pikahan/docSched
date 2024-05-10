import { IDirectMessage, IMember, IUser, MessageAttachment, MessageReference, MessageToCreate } from "qq-guild-bot";
import { Msg, QQBotClient } from "src/common/type/qq-bot-type";
import { MessageType } from "src/config/opt";
import { RedisService } from "src/redis/redis.service";
import { BotService } from './bot.service';

type Underscore<S extends string> = S extends '' ? '' : (S extends `${infer L}_${infer R}` ? `${L}${Underscore<Capitalize<R>>}` : S);

type UnderscoreObj<T> = {
    [K in keyof T as Underscore<K & string>]: T[K]
};

type SendMsgDirect = UnderscoreObj<Partial<IDirectMessage> & MessageToCreate> & { sendType?: MessageType, ref?: boolean; imageUrl?: string; };

// export async function callWithRetry<T extends (...args: A) => Promise<R>, R, A extends Array<any>>(functionCall: (...args: A) => Promise<R>, args: Parameters<T>, retries = 0, errors: any[] = []): Promise<RetryResult<R>> {
//     try {
//         const result = await functionCall(...args);
//         return { result, errors };
//     } catch (err) {
//         if (args[0]?.imageFile) args[0].imageFile = { type: "Buffer", length: args[0].imageFile.length };

//         if (err && ((err as any).code == 304027) && args && args[0] && args[0].msgId) { //message is expired
//             retries--;
//             args[0].msgId = await redis.get(`lastestMsgId:${botType}`);
//         } else log.error(err);
//         if (typeof err == "object") errors.push(JSON.stringify(err));
//         else errors.push(String(err));
//         if (err && (err as any).code == 304003 || ((err as any)?.msg as string | null)?.includes("url not allowed")) {
//             log.error(`url 不被允许:\n`, JSON.stringify(args[0]));
//             throw { errors };
//         }
//         if (err && (err as any).code == 40014 || ((err as any)?.msg as string | null)?.includes("file too large")) {
//             log.error(`文件过大\n`, JSON.stringify(args[0]));
//             throw { errors };
//         }
//         if (err && (err as any).code == 304020 || ((err as any)?.msg as string | null)?.includes("file size exceeded")) {
//             log.error(`文件超过大小\n`, JSON.stringify(args[0]));
//             throw { errors };
//         }
//         if (retries < config.retryTime - 1) {
//             await sleep(100);
//             return await callWithRetry(functionCall, args, ++retries, errors);
//         } else {
//             log.error(`重试多次未成功 args:\n`, JSON.stringify(args[0]));
//             throw { errors };
//         }
//     }
// }

class IMessageChatCommon {
    id: string;
    author: IUser;
    content: string;
    timestamp: string;
    messageType: MessageType;
    attachments: { content_type: string; filename: string; height: number; size: number; url: string; width: number; }[];

    constructor(msg: Msg['msg'], messageType: MessageType) {
        this.id = msg.id;
        this.author = msg.author;
        this.content = msg.content;
        this.timestamp = msg.timestamp;
        this.messageType = messageType;
        this.attachments = msg.attachments;
    }
}

class IMessageChannelCommon {
    id: string;
    channel_id: string;
    guild_id: string;
    content: string;
    timestamp: string;
    author: IUser;
    member: IMember;
    attachments?: (MessageAttachment & { content_type: string })[];
    seq: number;
    seq_in_channel: string;
    src_guild_id?: string;
    message_reference?: MessageReference;
    client: QQBotClient['client'];
    redis: RedisService;
    botService: BotService;
    _atta: string;
    messageType: MessageType;
    bindId?: string;
    result?: string;
    schedId: number;

    constructor(service: { client: QQBotClient['client']; botService: BotService, redis: RedisService }, msg: Msg['msg'], messageType: MessageType) {
        this.redis = service.redis;
        this.client = service.client;
        this.botService = service.botService;
        this.id = msg.id;
        this.channel_id = msg.channel_id;
        this.guild_id = msg.guild_id;
        this.content = msg.content || "";
        this.timestamp = msg.timestamp;
        this.author = msg.author;
        this.member = msg.member;
        this.attachments = msg.attachments;
        this.seq = msg.seq;
        this.seq_in_channel = msg.seq_in_channel;
        this.message_reference = msg.message_reference;

        this.messageType = messageType;
        this._atta = this.attachments ? `[图片${this.attachments.length + "张"}]` : "";
    }

    async sendMsgExRef(options: SendMsgDirect) {
        options.ref = true;
        return this.sendMsgEx(options);
    }

    async sendMsgEx(options: SendMsgDirect) {
        // global.botStatus.msgSendNum++;
        options.msgId = options.msgId || this.id || await this.redis.get('latestMsgId') || undefined;
        options.guildId = options.guildId || this.guild_id;
        options.channelId = options.channelId || this.channel_id;
        options.sendType = options.sendType || this.messageType;
        options.ark = options.ark;
        // return callWithRetry(this._sendMsgEx, [options]);
        return this._sendMsgEx(options);
    }

    private _sendMsgEx = async (options: SendMsgDirect) => {
        // if (options.imagePath || options.imageFile) return this.sendImage(options as any);
        const { ref, content, imageUrl, ark } = options;
        if (options.sendType == MessageType.GUILD) return this.client.messageApi.postMessage(options.channelId || "", {
            msg_id: options.msgId,
            content: content,
            message_reference: (ref && options.msgId) ? { message_id: options.msgId, } : undefined,
            image: imageUrl,
            ark: ark,
        }).then(res => res.data);
        else return this.client.directMessageApi.postDirectMessage(options.guildId!, {
            msg_id: options.msgId,
            content: content,
            image: imageUrl,
        }).then(res => ({ ...res.data, traceId: res.headers["x-tps-trace-id"], }));
    }

    // async sendMarkdown(options: Partial<SendOption.Channel> & SendOption.MarkdownPublic) {
    //     options.guildId = options.guildId || this.guild_id;
    //     options.eventId = await redis.get(`lastestEventId:${meId}:${options.guildId}`) || undefined;
    //     if (botType == "PlanaBot" || !options.eventId) return this.sendMsgEx(options);
    //     if (devEnv) log.debug("options.eventId:", options.eventId);

    //     const markdownConfig = await getMarkdown(options);
    //     if (!markdownConfig) return this.sendMsgEx(options);
    //     return callWithRetry(this._sendMarkdown, [{ ...options, ...markdownConfig, }]).catch(err => this.sendMsgEx(options));
    // }

    // private _sendMarkdown = async (options: Partial<SendOption.Channel> & SendOption.MarkdownOrgin) => {
    //     return fetch(`https://api.sgroup.qq.com/channels/${options.channelId || this.channel_id}/messages`, {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //             "Authorization": `Bot ${config.bots[botType].appID}.${config.bots[botType].token}`,
    //         },
    //         body: JSON.stringify({
    //             event_id: options.eventId,
    //             markdown: options.markdown,
    //             keyboard: options.keyboard,
    //         }),
    //     }).then(async res => {
    //         const json = await res.json();
    //         if (json.code) {
    //             log.error(res.headers.get("x-tps-trace-id"));
    //             throw json;
    //         } else return json;
    //     });
    // }

    // async pushToDB(another: Record<string, string>) {
    //     const attachments: string[] = [];
    //     if (this.attachments)
    //         for (const path of this.attachments) attachments.push(path.url);
    //     return pushToDB(this.messageType == MessageType.DIRECT ? "directMessage" : "guildMessage", Object.assign({
    //         mid: this.id,
    //         aid: this.author.id,
    //         aAvatar: this.author.avatar,
    //         aName: this.author.username,
    //         gid: this.guild_id,
    //         cid: this.channel_id,
    //         seq: this.seq,
    //         ts: this.timestamp,
    //         content: this.content,
    //         attachments: attachments.join(),
    //         refer: this.message_reference?.message_id || "",
    //     }, another));
    // }

    // async sendToAdmin(content: string) {
    //     return this.sendMsgEx({
    //         content,
    //         sendType: MessageType.DIRECT,
    //         guildId: await redis.hGet(`directUid->Gid:${meId}`, adminId[0]),
    //     });
    // }

    // private sendImage = async (options: SendOption.Channel): Promise<IMessage> => {
    //     const { sendType, content, imagePath, imageFile, imageUrl, msgId, guildId, channelId } = options;
    //     const pushUrl = (sendType == MessageType.DIRECT) ? `https://api.sgroup.qq.com/dms/${guildId}/messages` : `https://api.sgroup.qq.com/channels/${channelId}/messages`;
    //     const formdata = new FormData();
    //     if (msgId) formdata.append("msg_id", msgId);
    //     if (content) formdata.append("content", content);
    //     if (imageFile) formdata.append("file_image", imageFile, { filename: 'image.jpg' });
    //     if (imagePath) formdata.append("file_image", fs.createReadStream(imagePath));
    //     if (imageUrl) formdata.append("image", imageUrl);
    //     return fetch(pushUrl, {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": formdata.getHeaders()["content-type"],
    //             "Authorization": `Bot ${config.bots[botType].appID}.${config.bots[botType].token}`,
    //         }, body: formdata
    //     }).then(res => res.json()).then(body => {
    //         if (body.code) throw body;
    //         return body;
    //     });
    // }
}

export class IMessageDIRECT extends IMessageChannelCommon {
    direct_message: true;
    src_guild_id: string;
    constructor(service: { client: QQBotClient['client']; botService: BotService, redis: RedisService }, msg: Msg['msg'], register = true) {
        super(service, msg, MessageType.DIRECT);
        this.direct_message = msg.direct_message;
        this.src_guild_id = msg.src_guild_id;

        if (!register) return;

        // log.info(`频私{${this.guild_id}}(${this.author.username}|${this.author.id})${this._atta}: ${this.content}`);
        // this.pushToDB({ srcGid: this.src_guild_id });
    }
}

export class IMessageGUILD extends IMessageChannelCommon {
    mentions?: IUser[];
    guildName: string;
    channelName: string;

    constructor(service: { client: QQBotClient['client']; botService: BotService, redis: RedisService }, msg: Msg['msg'], register = true) {
        super(service, msg, MessageType.GUILD);
        this.mentions = msg.mentions;
        // this.guildName = saveGuildsTree[this.guild_id]?.name;
        // this.channelName = saveGuildsTree[this.guild_id]?.channels[this.channel_id]?.name;

        if (!register) return;

        // log.info(`频公{${this.guildName}}[${this.channelName}|${this.channel_id}](${this.author.username}|${this.author.id})${this._atta}: ${this.content}`);

        const mention: string[] = [];
        if (this.mentions) for (const user of this.mentions) mention.push(user.id);
        // this.pushToDB({
        //     mentions: mention.join(","),
        //     cName: this.channelName || "",
        // });

    }
}

export async function findOpts(msg: IMessageGUILD | IMessageDIRECT): Promise<{ path: string; fnc: string; keyChild: string; data?: string; result: string; } | null> {
    if (!msg.content) return null;

    const configOpt = (await import("../config/opt")).default;
    const commandFathers: Record<string, Record<string, {
        reg: string;
        fnc: string;
        channelAllows?: string[];
        data?: string;
        type: string[],
        describe: string;
    }>> = configOpt.command;
    // const channelAllows: {
    //     [allowKeys: string]: {
    //         id: string;
    //         name: string;
    //     }[];
    // } = configOpt.channelAllows;

    for (const keyFather in commandFathers)
        for (const keyChild in commandFathers[keyFather]) {
            const opt = commandFathers[keyFather][keyChild];
            const allowChannels = opt.channelAllows || ["common"];
            // if (devEnv) allowKeys.push("dev");
            if ((typeof opt == "function") || !opt.type.includes(msg.messageType)) continue;
            const content = msg.content.replace(/<@!\d*>/g, "").trim();
            const regResult = RegExp(opt.reg).test(content);
            if (!regResult) continue;

            // if (msg instanceof IMessageGROUP) {
            //     return { path: keyFather, keyChild, ...opt };
            // }

            // const channelAllow: () => boolean = () => {
            //     for (const allowChannelKey of allowChannels) for (const channel of channelAllows[allowChannelKey])
            //         if (channel.id == msg.channel_id) return true;
            //     return false;
            // }
            // if (devEnv || msg.guild_id == "5237615478283154023" || msg.messageType == MessageType.DIRECT || allowChannels[0] == "all" || channelAllow()) {
            //     return { path: keyFather, keyChild, ...opt };
            // }
            if (msg.messageType == MessageType.DIRECT || allowChannels[0] == "all") {
                return { path: keyFather, keyChild, result: content.replace(RegExp(opt.reg).exec(content)[0], '').trim(), ...opt };
            }
        }

    return null;
}