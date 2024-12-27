import OpenAI from 'openai';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
	OPEN_AI_KEY: string;
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

// translate and summarize document
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

// chat to document
app.post('/chatToDocument', async (context) => {
	const openai = new OpenAI({
		apiKey: context.env.OPEN_AI_KEY,
	});
	const { documentData, question } = await context.req.json();
	const chatCompletion = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content:
					'you are an assistant helping the user to chat to a document, I am providing an xml document for the file. Be sure to parse the xml and completely understand the document before answering the users question. Using this, answer the users questions in the clearest way possible, the document is about ' +
					documentData,
			},
			{
				role: 'user',
				content: 'my question is: ' + question,
			},
		],
		model: 'gpt-4o',
		temperature: 0.5,
	});
	const response = chatCompletion.choices[0].message.content;
	return context.json({ message: response });
});

export default app;
