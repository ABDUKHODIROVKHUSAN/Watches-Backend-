import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
	MEMBER = 'MEMBER',
	PROPERTY = 'PROPERTY',
	ARTICLE = 'ARTICLE',
	WATCH = 'WATCH',
}
registerEnumType(LikeGroup, {
	name: 'LikeGroup',
});
