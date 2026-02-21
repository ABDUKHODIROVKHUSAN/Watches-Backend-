import { Module } from '@nestjs/common';
import { AIResolver } from './ai.resolver';
import { AIService } from './ai.service';
import { WatchesModule } from '../watches/watches.module';
import { AuthModule } from '../auth/auth.module';

@Module({
	imports: [WatchesModule, AuthModule],
	providers: [AIResolver, AIService],
})
export class AIModule {}
