import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	PROPERTY = 'PROPERTY',
	WATCH = 'WATCH',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
