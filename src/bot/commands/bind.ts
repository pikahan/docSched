import { IMessageDIRECT, IMessageGUILD } from "../IMessageEx";

export const bind = async (msg: IMessageDIRECT) => {
  if (typeof msg.result !== 'string') {
    return;
  }
  const res = await msg.botService.bindQQToken(msg.author.id, msg.channel_id, msg.result);
  if (res) {
    msg.sendMsgExRef({
      content: '绑定成功',
    });
  }
};