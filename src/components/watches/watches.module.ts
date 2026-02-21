import { Module } from '@nestjs/common';
import { WatchesResolver } from './watches.resolver';
import { WatchesService } from './watches.service';
import { MongooseModule } from '@nestjs/mongoose';
import WatchSchema from '../../schemas/Watch.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: 'Watch',
				schema: WatchSchema,
			},
		]),
		AuthModule,
		ViewModule,
		MemberModule,
		LikeModule,
	],
	providers: [WatchesResolver, WatchesService],
	exports: [WatchesService],
})
export class WatchesModule {}
