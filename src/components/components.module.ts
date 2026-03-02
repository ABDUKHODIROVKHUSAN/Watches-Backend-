import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { AuthModule } from './auth/auth.module';
import { WatchesModule } from './watches/watches.module';
import { LikeModule } from './like/like.module';
import { ViewModule } from './view/view.module';
import { AIModule } from './ai/ai.module';
import { OrderModule } from './order/order.module';

@Module({
	imports: [
		MemberModule,
		AuthModule,
		WatchesModule,
		LikeModule,
		ViewModule,
		AIModule,
		OrderModule,
	],
})
export class ComponentsModule {}
