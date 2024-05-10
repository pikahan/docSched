import { IMessageDIRECT, IMessageGUILD } from "../IMessageEx";

export const plan = async (msg: IMessageDIRECT | IMessageGUILD) => {
  if (typeof msg.content !== 'string') {
    return;
  }
  if (!msg.attachments || msg.attachments.length === 0 || !msg.attachments.find(data => data.content_type.startsWith('image'))) {
    console.log('没有上传图片')
    msg.sendMsgExRef({
      content: '没有上传图片',
    });
    return;
  }
  const attachment = msg.attachments.find(data => data.content_type.startsWith('image'));
  const url = await msg.botService.generateReminder(msg.schedId, `https://${attachment.url}`);
  msg.sendMsgExRef({
    content: url,
  });
};

export const initPlan = async (msg: IMessageDIRECT | IMessageGUILD) => {

}

export const planUpdate = async (msg: IMessageDIRECT | IMessageGUILD) => {
  const item = msg.result.split('\n').map(word => word.trim());
  const workInfoList = item.map(str => {
    const splitStr = str.split(/\s/).map(word => word.trim());
    const name = splitStr[0];
    let workStartTime = splitStr?.[1];
    workStartTime = (workStartTime && /\d{1,2}:\d{1,2}/.test(workStartTime)) ? workStartTime : undefined;
    return {
      name,
      workStartTime,
    }
  });
  try {
    await msg.botService.updateWorks(msg.schedId, workInfoList);
    msg.sendMsgExRef({
      content: '更新成功',
    });
  } catch (ch) {
    console.error('更新失败', ch);
    msg.sendMsgExRef({
      content: '更新失败',
    });
  }
}

export const planInfo = async (msg: IMessageDIRECT | IMessageGUILD) => {
  const optionInfo = await msg.botService.getOptionInfo(msg.schedId);
  let content = '';
  optionInfo.works.forEach((w, i) => {
    const words = `${i !== 0 ? '\n' : ''}${w.name} ${w.workStartTime ? w.workStartTime.slice(0, 5) : '--'}`;
    content += words;
  });
  msg.sendMsgExRef({
    content: content,
  });
}