import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class RedisService {

    @Inject('REDIS_CLIENT')
    private redisClient: RedisClientType;

    async get(key: string) {
        return await this.redisClient.get(key);
    }

    async set(key: string, value: string, ttl?: number) {
        console.log(key, value);
        await this.redisClient.set(key, value);
        if(ttl) {
            await this.redisClient.expire(key, ttl);
        }
    }

    async hSet(key: string, field, value) {
        await this.redisClient.hSet(key, field, value);
    }

    async listGet(key: string) {
        return await this.redisClient.lRange(key, 0, -1);
    }

    async listSet(key: string, list: Array<string>, ttl?: number) {
        for(let i = 0; i < list.length;i++) {
            await this.redisClient.lPush(key, list[i]);
        }
        if(ttl) {
            await this.redisClient.expire(key, ttl);
        }
    }
}
