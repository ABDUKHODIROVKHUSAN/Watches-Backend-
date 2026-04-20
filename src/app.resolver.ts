import { Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service';

@Resolver()
export class AppResolver {
  constructor(private readonly appService: AppService) {}

  @Query(() => String)
  public sayHello(): string {
    return 'Watches GraphQL API Server';
  }

  @Query(() => String, { name: 'redisTest' })
  public async redisTest(): Promise<string> {
    const result = await this.appService.testRedis();
    return result ?? 'No value found';
  }
}