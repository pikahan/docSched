import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import * as oss from 'ali-oss';
import { createCanvas, loadImage } from 'canvas';
import { load } from 'cheerio';
import * as co from 'co';
import ical, { ICalCalendarMethod } from 'ical-generator';
import * as path from 'path';
import { Option } from 'src/option/entities/option.entity';
import { createWorker } from 'tesseract.js';
import { EntityManager } from 'typeorm';


const calendar = ical({name: 'ical test'});
// A method is required for outlook to display event as an invitation
calendar.method(ICalCalendarMethod.PUBLISH);

interface WordsWithPosition {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface WordsGroupInfo {
  top: number;
  left: number;
  bottom: number;
  right: number;
  workText: string[];
}

@Injectable()
export class OcrService {

  constructor(
    private httpService: HttpService,
    @InjectEntityManager() private entityManager: EntityManager,
    private configService: ConfigService,
  ) {}

  async uploadFile(icsBuffer: Buffer, data: { bucket: string; name: string }) {

    const token = {
      accessKeyId: this.configService.get('ACCESS_KEY_ID'),
      accessKeySecret: this.configService.get('ACCESS_KEY_SECRET'),
      bucket: this.configService.get('BUCKET'),
      endpoint: this.configService.get('ENDPOINT'),
      cname: true,
    };
    const client = new oss(token);
    try {
      const result = await co(function* () {
        return yield client.put(data.name, icsBuffer);
      });
      return result.url;
    } catch (ch) {
      throw new HttpException('oss 上传出错', HttpStatus.ACCEPTED);
    }
    // try {
    //   const response = await lastValueFrom(this.httpService.post('https://oss.byrobot.cn/oss/upload', formData, {
    //     headers: {
    //       ...formData.getHeaders()
    //     },
    //   }).pipe(map(response => {
    //     console.log(response);
    //     return response.data;
    //   })));

    //   // Handle response here
    //   return response;
    // } catch (error) {
    //   // Handle error here
    //   console.error(error);
    //   throw error;
    // }
  }

  async getDateUrl(imagePath: string) {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, image.width, image.height);
    return canvas.toDataURL();
  }

  // 水平距离接近的判断是一个词语
  getMergedWords(hocr: string) {
    const $ = load(hocr);
    const wordsWithPosition: WordsWithPosition[] = [];
    $('.ocrx_word').each((index, element) => {
        const text = $(element).text().replace(/\s/g, '');
        const title = $(element).attr('title');
        const match = title.match(/bbox\s(\d+)\s(\d+)\s(\d+)\s(\d+)/);
        if (match && match.length === 5) {
          const left = parseInt(match[1]);
          const top = parseInt(match[2]);
          const width = parseInt(match[3]) - left;
          const height = parseInt(match[4]) - top;
          wordsWithPosition.push({ text, left, top, width, height });
        }
    });

    // 根据词语之间的间距判断是否是一个词语
    const wordThreshold = 30; // 调整这个阈值以适应你的具体场景
    const mergedWords: WordsWithPosition[] = [];
    let currentWord = null;

    wordsWithPosition.forEach((word, index) => {
        if (!currentWord) {
            currentWord = { ...word };
        } else {
            const distance = Math.abs(word.left - (currentWord.left + currentWord.width));
            if (distance <= wordThreshold) {
                currentWord.text += word.text;
                currentWord.width = word.left + word.width - currentWord.left;
            } else {
                mergedWords.push(currentWord);
                currentWord = { ...word };
            }
        }
        if (index === wordsWithPosition.length - 1) {
            mergedWords.push(currentWord);
        }
    });
    return mergedWords;
  }

  async generateReminder(imagePath: string, optionId: number) {
    const dataUrl = await this.getDateUrl(imagePath);
    // 创建Tesseract工作器
    const worker = await createWorker('chi_sim', 1, {
      langPath: path.join(__dirname, process.env.NODE_ENV === 'production' ? '..' : '../..'),
    });
    const option = await this.entityManager.findOneBy(Option, {
      id: optionId,
    });

    worker.setParameters({
      tessedit_char_whitelist: option.chatList
    });

    // 识别文字及位置
    const { data: { hocr } } = await worker.recognize(dataUrl);
    // 关闭工作器
    await worker.terminate();


    // 检查两个框之间的垂直距离是否足够接近
    function isVerticalClose(box1, box2) {
      const verticalDistanceThreshold = 40; // 调整此阈值以适应你的数据
      const v1 = Math.abs(box1.top + box1.height - box2.top);
      const v2 = Math.abs(box2.top + box2.height - box1.top);
      return v1 <= verticalDistanceThreshold || v2 <= verticalDistanceThreshold;
    }

    function isHorizontalFar(box1, box2) {
      const box1Right = box1.left + box1.width;
      const box2Right = box2.left + box2.width;
      const right = Math.max(box1Right, box2Right);
      const left = Math.min(box1.left, box2.left);
      const boxWidth = Math.abs(right -left);
      return boxWidth >= (box1.width + box2.width);
    }

    function judgeWordsHelper(wordsAndBoxes: WordsWithPosition[]) {
      const visitedFlagMap = new WeakMap();
      wordsAndBoxes.forEach(w => visitedFlagMap.set(w, false));

      function helper(currBox: WordsWithPosition) {
        const wordsGroup = [currBox];
        visitedFlagMap.set(currBox, true);
        wordsAndBoxes.forEach((words) => {
          if (!visitedFlagMap.get(words) && isVerticalClose(currBox, words) && !isHorizontalFar(currBox, words)) {
            wordsGroup.push(...helper(words));
          }
        });
        return wordsGroup;
      }
      const ret: WordsWithPosition[][] = [];
      for (let i = 0; i < wordsAndBoxes.length; i++) {
        const currWords = wordsAndBoxes[i];
        if (visitedFlagMap.get(currWords)) {
          continue;
        }
        ret.push(helper(currWords));
      }
      return ret;
    }

    const mergedWords = this.getMergedWords(hocr);
    const result = judgeWordsHelper(mergedWords);
    const { dateResult, workGroupResult } = result.reduce((prev, curr) => {
      const { dateResult, workGroupResult } = prev;
      const dateInfo = curr.find(words => {
        const dateRegex = /\b(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[01])\b/g;
        return dateRegex.test(words.text);
      });
      if (dateInfo) {
        return {
          dateResult: [...dateResult, dateInfo],
          workGroupResult,
        }
      }
      const workGroupInfo = {
        top: Math.min(...curr.map(w => w.top)),
        left: Math.min(...curr.map(w => w.left)),
        bottom: Math.max(...curr.map(w => w.top + w.height)),
        right: Math.max(...curr.map(w => w.left + w.width)),
        workText: curr.map(w => w.text),
      }

      return {
        dateResult,
        workGroupResult: [...workGroupResult, workGroupInfo],
      }
    }, { dateResult: [] as WordsWithPosition[], workGroupResult: [] as WordsGroupInfo[] });
    const dateInfoFinal = dateResult.map(date => {
      const ret: WordsGroupInfo[] = [];
      workGroupResult.forEach(work => {
        const center = Math.abs(work.bottom + work.top) / 2;
        const dateBottom = date.top + date.height;
        if (center < dateBottom && center > date.top) {
          ret.push(work);
          console.log(work, date);

        } else if (work.bottom < dateBottom && work.bottom > date.top) {
          ret.push(work);
          console.log(work, date);
        } else if (work.top < dateBottom && work.top > date.top) {
          ret.push(work);
          console.log(work, date);
        }
      });
      return {
        ...date,
        workInfo: ret,
      }
    });

    const optionEntity = await this.entityManager.findOne(Option, {
      where: {
        id: optionId,
      },
      relations: {
        works: true,
      }
    });
    const workNameMap = new Map<string, string>();
    optionEntity.works.forEach(work => {
      workNameMap.set(work.name, work.workStartTime);
    });
    dateInfoFinal.flatMap(dateInfo => {
      const currWorkInfo = dateInfo.workInfo;
      const ret = [];
      currWorkInfo.forEach(w => {
        w.workText.forEach(currWords => {
          if (!workNameMap.has(currWords)) {
            return;
          }
          const targetTime = workNameMap.get(currWords);
          ret.push({ name: currWords, time: targetTime });

        });
      });
      const currYear = (new Date).getFullYear();
      const currDate = dateInfo.text.slice(0, 5);
      ret.map(v => {
        const allDayFlag = !v.time;
        const eventTime = new Date(`${currYear}-${currDate}${allDayFlag ? '' : (' ' + v.time)}`);
        calendar.createEvent({
          start: eventTime,
          end: allDayFlag ? undefined : eventTime, // 这里假设提醒是一次性事件，结束时间和开始时间相同
          summary: `${v.name} 工作提醒`,
          allDay: allDayFlag,
          timezone: 'Asia/Beijing',
          location: 'my room',
        });
      });
    });
    const ocrInfo = calendar.toString();
    calendar.clear();
    const ossFile = await this.uploadFile(Buffer.from(ocrInfo), {
      bucket: 'by-fe-cdn',
      name: `static/aiplm/${(new Date()).getTime()}.ics`,
    });
    return ossFile;
  }
}
