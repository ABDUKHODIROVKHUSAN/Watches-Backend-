import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIActionType, AIChatResponse, WatchAIInsights } from '../../libs/DTO/ai/ai';
import { Watch } from '../../libs/DTO/watch/watch';
import { Message } from '../../libs/enums/common.enum';
import { WatchesService } from '../watches/watches.service';
import { FileUpload } from 'graphql-upload';

type AiChatPayload = {
	reply?: string;
	actionType?: string;
	actionTarget?: string;
	recommendedWatchIds?: string[];
};

type VisualTraits = {
	strapMaterial?: string;
	caseMaterial?: string;
	dialColor?: string;
	strapColor?: string;
	styleTags?: string[];
};

const ALLOWED_PAGE_TARGETS = ['/', '/watches', '/watches/detail', '/mypage', '/ai-help', '/contact'];
const SUPPORTED_LOCALES = ['en', 'ko', 'uz'];

@Injectable()
export class AIService {
	private genAI: GoogleGenerativeAI;

	constructor(private readonly watchesService: WatchesService) {
		this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	}

	public async getWatchInsights(watch: Watch): Promise<WatchAIInsights> {
		const prompt = `
You are a luxury watch expert. Provide detailed information about the "${watch.watchTitle}" by ${watch.watchBrand}.
Return a JSON object with exactly this structure (no markdown, no code blocks, just pure JSON):
{
  "salesInfo": "Estimated global sales data for this watch model this year, including approximate units sold and market demand",
  "celebrityWearers": [
    { "name": "Celebrity Name", "description": "Brief context of how/when they wore it" }
  ],
  "fashionTips": [
    { "outfit": "Specific clothing/style recommendation", "occasion": "When to wear this combination" }
  ],
  "priceRange": "Current market price range (new and pre-owned)",
  "funFacts": ["Interesting fact 1", "Interesting fact 2", "Interesting fact 3"],
  "summary": "A brief 2-3 sentence overview of why this watch is notable"
}

Provide at least 3 celebrity wearers, 3 fashion tips, and 3 fun facts.
Make all information accurate and relevant to this specific watch model.
`;

		try {
			const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
			const result = await model.generateContent(prompt);
			const content = result.response.text();

			if (!content) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

			const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
			const parsed = JSON.parse(cleaned);

			return {
				watchTitle: watch.watchTitle,
				watchBrand: watch.watchBrand,
				salesInfo: parsed.salesInfo,
				celebrityWearers: parsed.celebrityWearers,
				fashionTips: parsed.fashionTips,
				priceRange: parsed.priceRange,
				funFacts: parsed.funFacts,
				summary: parsed.summary,
			};
		} catch (err) {
			console.log('AI Service Error:', err.message);
			throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async getBrandInsights(brand: string): Promise<WatchAIInsights> {
		const cleanBrand = (brand || 'Luxury Watch Brand').trim();
		const displayBrand = cleanBrand
			.split(/[\s_]+/)
			.filter(Boolean)
			.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');

		const prompt = `
You are a luxury watch expert. Provide detailed information about the watch brand "${displayBrand}".
Return a JSON object with exactly this structure (no markdown, no code blocks, just pure JSON):
{
  "salesInfo": "Estimated global sales and market demand overview for the brand this year",
  "celebrityWearers": [
    { "name": "Celebrity Name", "description": "How or when they are known to wear this brand" }
  ],
  "fashionTips": [
    { "outfit": "Specific styling recommendation", "occasion": "When to wear it" }
  ],
  "priceRange": "Typical market price range across entry, mid, and high-end references",
  "funFacts": ["Interesting fact 1", "Interesting fact 2", "Interesting fact 3"],
  "summary": "A brief 2-3 sentence brand overview, including hallmark design traits"
}

Provide at least 3 celebrity wearers, 3 fashion tips, and 3 fun facts.
Keep the information specific to the brand and practical for buyers.
`;

		try {
			const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
			const result = await model.generateContent(prompt);
			const content = result.response.text();

			if (!content) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

			const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
			const parsed = JSON.parse(cleaned);

			return {
				watchTitle: `${displayBrand} Signature Models`,
				watchBrand: displayBrand,
				salesInfo: parsed.salesInfo,
				celebrityWearers: parsed.celebrityWearers,
				fashionTips: parsed.fashionTips,
				priceRange: parsed.priceRange,
				funFacts: parsed.funFacts,
				summary: parsed.summary,
			};
		} catch (err) {
			console.log('AI Brand Service Error:', err.message);
			throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		}
	}

	public async aiChat(message: string, locale: string = 'en'): Promise<AIChatResponse> {
		const cleanMessage = (message || '').trim();
		if (!cleanMessage) {
			return {
				reply: 'Please ask me about watches in our store, watch brands, or ask me to open a page.',
				actionType: AIActionType.NONE,
				recommendedWatchIds: [],
			};
		}

		const normalizedLocale = this.normalizeLocale(locale);
		const catalog = await this.watchesService.getCatalogForAI(cleanMessage, 18);
		const catalogIds = new Set(catalog.map((watch) => String(watch._id)));
		const catalogContext = catalog
			.map((watch) => {
				return `id=${watch._id}; brand=${watch.watchBrand}; title=${watch.watchTitle}; type=${watch.watchType}; price=${watch.watchPrice}`;
			})
			.join('\n');

		const prompt = `
You are the AI concierge for an online watch store.
Respond in language locale "${normalizedLocale}".

Strict rules:
1) Only answer about watches, watch brands, watch buying guidance, watches available in this catalog, or navigation to site pages.
2) If user asks unrelated topics, politely refuse and redirect to watch/store help.
3) For recommendations, prioritize items from provided catalog context.
4) If user asks to open/navigate/go to a page, set actionType to OPEN_PAGE and actionTarget to one of:
${ALLOWED_PAGE_TARGETS.join(', ')}
5) If no navigation intent, use actionType NONE and actionTarget empty string.
6) recommendedWatchIds must be an array of ids from the catalog only.

Catalog context:
${catalogContext || 'No watches available in catalog context.'}

Return JSON only (no markdown):
{
  "reply": "string",
  "actionType": "NONE or OPEN_PAGE",
  "actionTarget": "string",
  "recommendedWatchIds": ["id1","id2"]
}

User message:
${cleanMessage}
`;

		try {
			const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
			const result = await model.generateContent(prompt);
			const content = result.response.text();
			if (!content) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

			const parsed = this.parseAiJson(content);
			return this.sanitizeAiChatPayload(parsed, catalogIds, cleanMessage, normalizedLocale);
		} catch (err) {
			console.log('AI Chat Service Error:', err.message);
			return this.buildFallbackChatResponse(cleanMessage, normalizedLocale);
		}
	}

	private parseAiJson(content: string): AiChatPayload {
		const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
		return JSON.parse(cleaned) as AiChatPayload;
	}

	private sanitizeAiChatPayload(
		payload: AiChatPayload,
		catalogIds: Set<string>,
		message: string,
		locale: string,
	): AIChatResponse {
		const safeReply = (payload.reply || '').trim();
		const safeActionType =
			payload.actionType === AIActionType.OPEN_PAGE ? AIActionType.OPEN_PAGE : AIActionType.NONE;

		const safeActionTarget =
			safeActionType === AIActionType.OPEN_PAGE && payload.actionTarget && ALLOWED_PAGE_TARGETS.includes(payload.actionTarget)
				? payload.actionTarget
				: this.detectPageIntent(message);

		const recommendedWatchIds = Array.isArray(payload.recommendedWatchIds)
			? payload.recommendedWatchIds
					.map((id) => String(id))
					.filter((id) => catalogIds.has(id))
					.slice(0, 6)
			: [];

		return {
			reply: safeReply || this.defaultWatchOnlyReply(locale),
			actionType: safeActionTarget ? AIActionType.OPEN_PAGE : AIActionType.NONE,
			actionTarget: safeActionTarget || undefined,
			recommendedWatchIds,
		};
	}

	private buildFallbackChatResponse(message: string, locale: string): AIChatResponse {
		const actionTarget = this.detectPageIntent(message);
		return {
			reply: this.defaultWatchOnlyReply(locale),
			actionType: actionTarget ? AIActionType.OPEN_PAGE : AIActionType.NONE,
			actionTarget: actionTarget || undefined,
			recommendedWatchIds: [],
		};
	}

	private detectPageIntent(message: string): string | null {
		const text = (message || '').toLowerCase();
		if (!/(open|go|navigate|move|show|page|sahifa|och|이동|열어|페이지)/i.test(text)) return null;
		if (/watch|watches|soat|soatlar|시계/.test(text)) return '/watches';
		if (/my\s?page|mypage|account|profile|mening|마이/.test(text)) return '/mypage';
		if (/contact|aloqa|문의|연락/.test(text)) return '/contact';
		if (/ai\s?help|assistant|도움|yordam/.test(text)) return '/ai-help';
		if (/home|main|bosh|홈/.test(text)) return '/';
		return null;
	}

	private defaultWatchOnlyReply(locale: string): string {
		if (locale === 'ko') {
			return '시계, 브랜드, 사이트 내 시계 추천이나 페이지 이동 관련 질문을 도와드릴 수 있어요.';
		}
		if (locale === 'uz') {
			return "Men sizga faqat soatlar, brendlar, do'kondagi soatlar tavsiyasi va sahifa ochish bo'yicha yordam bera olaman.";
		}
		return 'I can help only with watches, watch brands, recommendations from this store, and opening site pages.';
	}

	private normalizeLocale(locale: string): string {
		const value = (locale || '').trim().toLowerCase();
		return SUPPORTED_LOCALES.includes(value) ? value : 'en';
	}

	public async visualSearchWatches(file: FileUpload, locale: string = 'en'): Promise<Watch[]> {
		const normalizedLocale = this.normalizeLocale(locale);
		const imageBase64 = await this.readUploadAsBase64(file);
		const watches = await this.watchesService.getCatalogForAI('', 120);
		if (!watches.length) return [];

		let traits: VisualTraits = {};
		try {
			traits = await this.extractVisualTraits(imageBase64, file.mimetype, normalizedLocale);
		} catch (err) {
			console.log('Visual trait extraction failed:', err.message);
		}

		const scored = watches
			.map((watch) => ({
				watch,
				score: this.scoreVisualMatch(watch, traits),
			}))
			.sort((a, b) => b.score - a.score);

		const topScore = scored[0]?.score ?? 0;
		if (topScore <= 0) {
			return [...watches]
				.sort((a, b) => Number(b?.watchLikes || 0) - Number(a?.watchLikes || 0))
				.slice(0, 6) as Watch[];
		}

		const threshold = Math.max(1, topScore - 1);
		const strict = scored.filter((item) => item.score >= threshold).slice(0, 6).map((item) => item.watch);
		if (strict.length >= 3) return strict as Watch[];

		return scored.slice(0, 6).map((item) => item.watch) as Watch[];
	}

	private async extractVisualTraits(imageBase64: string, mimeType: string, locale: string): Promise<VisualTraits> {
		const prompt = `
You analyze luxury watch photos for a watch e-commerce visual search.
Respond in JSON only (no markdown):
{
  "strapMaterial": "steel|leather|rubber|fabric|ceramic|gold|titanium|unknown",
  "caseMaterial": "steel|gold|titanium|ceramic|platinum|unknown",
  "dialColor": "black|white|blue|green|silver|gold|brown|grey|red|unknown",
  "strapColor": "black|white|blue|green|silver|gold|brown|grey|red|unknown",
  "styleTags": ["sport","dress","classic","luxury","diver","chronograph"]
}
Locale: ${locale}
`;

		const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
		const result = await model.generateContent([
			prompt,
			{
				inlineData: {
					mimeType: mimeType || 'image/jpeg',
					data: imageBase64,
				},
			},
		]);
		const text = result.response.text();
		if (!text) return {};
		const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
		const parsed = JSON.parse(cleaned) as VisualTraits;
		return {
			strapMaterial: this.norm(parsed.strapMaterial),
			caseMaterial: this.norm(parsed.caseMaterial),
			dialColor: this.norm(parsed.dialColor),
			strapColor: this.norm(parsed.strapColor),
			styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags.map((item) => this.norm(item)).filter(Boolean) : [],
		};
	}

	private scoreVisualMatch(watch: any, traits: VisualTraits): number {
		const strapMaterial = this.norm(watch?.strapMaterial);
		const caseMaterial = this.norm(watch?.caseMaterial);
		const dialColor = this.norm(watch?.dialColor);
		const strapColor = this.norm(watch?.strapColor);
		const type = this.norm(watch?.watchType);
		const titleDesc = `${this.norm(watch?.watchTitle)} ${this.norm(watch?.watchDesc)}`;

		let score = 0;
		if (traits.strapMaterial && strapMaterial && strapMaterial.includes(traits.strapMaterial)) score += 4;
		if (traits.caseMaterial && caseMaterial && caseMaterial.includes(traits.caseMaterial)) score += 3;
		if (traits.dialColor && dialColor && dialColor.includes(traits.dialColor)) score += 2;
		if (traits.strapColor && strapColor && strapColor.includes(traits.strapColor)) score += 2;

		for (const tag of traits.styleTags || []) {
			if (!tag) continue;
			if (type.includes(tag)) score += 2;
			if (titleDesc.includes(tag)) score += 1;
		}
		return score;
	}

	private async readUploadAsBase64(file: FileUpload): Promise<string> {
		const stream = file.createReadStream();
		const chunks: Buffer[] = [];
		await new Promise<void>((resolve, reject) => {
			stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			stream.on('error', reject);
			stream.on('end', () => resolve());
		});
		return Buffer.concat(chunks).toString('base64');
	}

	private norm(value: string): string {
		return String(value || '')
			.trim()
			.toLowerCase();
	}
}
