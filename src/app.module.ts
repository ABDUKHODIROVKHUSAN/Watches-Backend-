import { Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';

@Module({
	imports: [
		RedisModule,
		ConfigModule.forRoot(),

		GraphQLModule.forRoot({
			driver: ApolloDriver,
			playground: true,

			// ✅ KEEP THIS FALSE (since we use external middleware)
			uploads: false,

			autoSchemaFile: true,

			formatError: (error: T) => {
				const graphQLFormattedError = {
					code: error?.extensions?.code,
					message:
						error?.extensions?.exception?.response?.message ||
						error?.extensions?.response?.message ||
						error?.message,
				};
				console.log('GRAPHQL GLOBAL ERR:', graphQLFormattedError);
				return graphQLFormattedError;
			},
		}),

		ComponentsModule,
		DatabaseModule,
	],
	controllers: [AppController],
	providers: [AppService, AppResolver],
})
export class AppModule {}