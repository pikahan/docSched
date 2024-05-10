import { AvailableIntentsEventsEnum, createOpenAPI, createWebsocket, IMember, IUser, MessageReference } from 'qq-guild-bot';

export type QQBotClient = {
  ws: ReturnType<typeof createWebsocket> & { on: (type: AvailableIntentsEventsEnum, cb: ((msg: Msg) => void)) => void; },
  client: ReturnType<typeof createOpenAPI>,
};

export interface Msg {
  eventType: string;
  eventRootType: AvailableIntentsEventsEnum;
  eventId: string;
  msg: {
    member: IMember;
    mentions: IUser[];
    author: IUser;
    seq: number;
    direct_message?: true;
    src_guild_id: string;
    timestamp: string;
    content: string;
    attachments: any;
    guild_id: string;
    id: string;
    name: string;
    op_user_id: string;
    owner_id: string;
    sub_type: number;
    channel_id: string;
    type: number;
    seq_in_channel: string;
    message_reference?: MessageReference;
  }
};