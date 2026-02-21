import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WatchAIInsights } from '../../libs/DTO/ai/ai';
import { Watch } from '../../libs/DTO/watch/watch';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class AIService {
	private genAI: GoogleGenerativeAI;

	constructor() {
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
}
