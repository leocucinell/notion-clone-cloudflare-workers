import OpenAI from 'openai';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
	OPEN_AI_KEY: OpenAI;
	AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
	'/*',
	cors({
		origin: '*',
		allowHeaders: ['Content-Type', 'X-Custom-Header', 'Upgrade-Insecure-Requests'],
		allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
		exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
		maxAge: 600,
		credentials: true,
	})
);

app.post('/translateDocument', async (context) => {
	const { documentData, targetLang } = await context.req.json();
	console.log('initial data:', documentData, targetLang);

	// Generate a summary of the document
	const summaryResponse = await context.env.AI.run('@cf/facebook/bart-large-cnn', {
		input_text: documentData,
		max_length: 1000,
	});
	console.log('summary res', summaryResponse);

	// Translate the summary into another language
	const response = await context.env.AI.run('@cf/meta/m2m100-1.2b', {
		text: summaryResponse.summary,
		source_lang: 'english',
		target_lang: targetLang,
	});
	console.log(response);

	// Return the translated response
	return new Response(JSON.stringify(response));
});

export default app;
