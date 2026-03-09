import { registerEnumType } from '@nestjs/graphql';

export enum WatchType {
	LUXURY = 'LUXURY',
	SPORT = 'SPORT',
	CLASSIC = 'CLASSIC',
	DRESS = 'DRESS',
	SMART = 'SMART',
}
registerEnumType(WatchType, {
	name: 'WatchType',
});

export enum WatchStatus {
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	OUT_OF_STOCK = 'OUT_OF_STOCK',
	DELETE = 'DELETE',
}
registerEnumType(WatchStatus, {
	name: 'WatchStatus',
});

export enum WatchBrand {
	ROLEX = 'ROLEX',
	OMEGA = 'OMEGA',
	CARTIER = 'CARTIER',
	TAG_HEUER = 'TAG_HEUER',
	PATEK_PHILIPPE = 'PATEK_PHILIPPE',
	AUDEMARS_PIGUET = 'AUDEMARS_PIGUET',
	BREITLING = 'BREITLING',
	IWC = 'IWC',
	HUBLOT = 'HUBLOT',
	TISSOT = 'TISSOT',
}
registerEnumType(WatchBrand, {
	name: 'WatchBrand',
});

export enum WatchLocale {
	EN = 'en',
	KO = 'ko',
	UZ = 'uz',
}
registerEnumType(WatchLocale, {
	name: 'WatchLocale',
});
