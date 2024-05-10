import { IMessageDIRECT, IMessageGUILD } from "../IMessageEx";

const typeMap = { GUILD: "频道", DIRECT: "频道私聊", GROUP: "群聊", FRIEND: "私聊" };

export const help = async (msg: IMessageGUILD | IMessageDIRECT) => {
  const opts = (await import("../../config/opt")).default.command;
  const sendStr = [`当前场景下（${typeMap[msg.messageType]}）可用的命令有：`];
  const split = `${" ".repeat(4)}===${" ".repeat(4)}`;
  for (const keyFather in opts) {
    const _: string[] = [];
    for (const keyChild in opts[keyFather]) {
        const opt = opts[keyFather][keyChild];
        if (!opt.export) continue;
        if (!opt.type.includes(msg.messageType)) continue;

        const examples = opt.export.split("\n");
        examples.map(example => _.push(`    > ${example}${split}${opt.describe}`));
    }
    if (_.length) sendStr.push(..._,);
  }

  sendStr.push(
      `参数描述:` +
      `    < > 包括在内的为必填参数`,
      `    [ ] 在内的为选填参数（有 | 存在时，参数只能选择 | 分割后的其中一个参数, 不存在时则为参数表述）`,
      `    IMAGE 表示上传图片`,
      `    所有命令实际使用均不包括 < > 或 [ ]`,
  );
  return msg.sendMsgEx({
    content: sendStr.join("\n"),
  }).catch(err => {
      throw new Error(JSON.stringify(err, undefined, "    "));
  });
}