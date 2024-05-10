import { Body, Controller, Get, HttpCode, Inject, Post, Query, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Public } from 'src/common/decorator/public.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UserService } from './user.service';

declare module 'express' {
  interface Request {
    user: {
      username: string;
      optionId: number;
    }
  }
}

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Inject(JwtService)
  private jwtService: JwtService;

  @HttpCode(200)
  @Public()
  @Post('login')
  async login(@Body() loginUser: LoginUserDto) {

    const user = await this.userService.login(loginUser);

    const access_token = this.jwtService.sign({
      userId: user.id,
      username: user.username,
      optionId: user.option.id,
    }, {
      expiresIn: '30m'
    });

    const refresh_token = this.jwtService.sign({
      userId: user.id
    }, {
      expiresIn: '7d'
    });

    return {
      access_token,
      refresh_token
    }
  }

  @HttpCode(200)
  @Public()
  @Post('register')
  async register(@Body() createUser: CreateUserDto) {
    return this.userService.register(createUser);
  }

  @HttpCode(200)
  @Public()
  @Get('refresh')
  async refresh(@Query('refresh_token') refreshToken: string) {
    try {
      const data = this.jwtService.verify(refreshToken);

      const user = await this.userService.findUserById(data.userId);

      const access_token = this.jwtService.sign({
        userId: user.id,
        username: user.username,
        optionId: user.option.id,
      }, {
        expiresIn: '30m'
      });

      const refresh_token = this.jwtService.sign({
        userId: user.id
      }, {
        expiresIn: '7d'
      });

      return {
        access_token,
        refresh_token
      }
    } catch(e) {
      throw new UnauthorizedException('token 已失效，请重新登录');
    }
  }
}
