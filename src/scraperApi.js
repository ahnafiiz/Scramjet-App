/**
 * ScraperAPI Integration for Vercel Deployment
 * Handles automatic IP rotation and reCaptcha bypass
 * Free tier: 1,000 requests/month
 */

import NodeCache from 'node-cache';

// Cache responses to maximize free tier usage
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour default

/**
 * Fetch with rotating IP via ScraperAPI
 * @param {string} url - Target URL to scrape
 * @param {object} options - Configuration options
 * @returns {Promise<string>} Response body
 */
export async function fetchWithRotatingIP(url, options = {}) {
	const apiKey = process.env.SCRAPER_API_KEY;

	if (!apiKey) {
		throw new Error('SCRAPER_API_KEY environment variable not configured. Sign up at https://www.scraperapi.com');
	}

	// Check cache first
	const cacheKey = `scrape:${url}`;
	if (options.useCache !== false && cache.has(cacheKey)) {
		console.log('[ScraperAPI] Cache hit:', url);
		return cache.get(cacheKey);
	}

	try {
		const scraperUrl = new URL('http://api.scraperapi.com');
		scraperUrl.searchParams.append('api_key', apiKey);
		scraperUrl.searchParams.append('url', url);

		// Optional: Geo-targeting
		if (options.country) {
			scraperUrl.searchParams.append('country_code', options.country);
		}

		// Optional: Premium rendering
		if (options.render) {
			scraperUrl.searchParams.append('render', 'true');
		}

		console.log('[ScraperAPI] Fetching:', url);

		const response = await fetch(scraperUrl.toString(), {
			method: 'GET',
			timeout: 30000,
			headers: {
				'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			},
		});

		if (!response.ok) {
			throw new Error(`ScraperAPI HTTP ${response.status}: ${response.statusText}`);
		}

		const data = await response.text();

		// Cache successful response
		cache.set(cacheKey, data);

		return data;
	} catch (error) {
		console.error('[ScraperAPI] Error:', error.message);
		throw error;
	}
}

/**
 * Fetch with specific geographic location
 * @param {string} url - Target URL
 * @param {string} country - Country code (US, UK, DE, etc.)
 * @returns {Promise<string>} Response body
 */
export async function fetchFromCountry(url, country = 'US') {
	return fetchWithRotatingIP(url, { country });
}

/**
 * Fetch with browser rendering (for JavaScript-heavy sites)
 * @param {string} url - Target URL
 * @returns {Promise<string>} Rendered HTML
 */
export async function fetchRendered(url) {
	return fetchWithRotatingIP(url, { render: true });
}

/**
 * Get usage statistics
 */
export function getCacheStats() {
	const keys = cache.keys();
	return {
		cachedUrls: keys.length,
		keys: keys,
	};
}

/**
 * Clear cache
 */
export function clearCache() {
	cache.flushAll();
}

/**
 * Setup ScraperAPI integration with Fastify
 */
export function setupScraperAPI(fastify) {
	// Health check endpoint
	fastify.get('/api/scraper-health', async (request, reply) => {
		const hasApiKey = !!process.env.SCRAPER_API_KEY;

		return reply.send({
			status: hasApiKey ? 'ready' : 'unconfigured',
			apiKeyConfigured: hasApiKey,
			cacheStats: getCacheStats(),
			message: hasApiKey ? 'ScraperAPI configured' : 'Set SCRAPER_API_KEY environment variable',
		});
	});

	// Scraping endpoint
	fastify.get('/api/scrape', async (request, reply) => {
		try {
			const { url, country, render } = request.query;

			if (!url) {
				return reply.code(400).send({
					error: 'Missing url parameter',
					example: '/api/scrape?url=https://example.com',
				});
			}

			const content = await fetchWithRotatingIP(url, {
				country: country || 'US',
				render: render === 'true',
				useCache: true,
			});

			return reply.type('text/html').send(content);
		} catch (error) {
			console.error('[API] Scrape error:', error);
			return reply.code(500).send({
				error: error.message,
				hint: 'Check SCRAPER_API_KEY is configured',
			});
		}
	});

	// JSON scraping endpoint
	fastify.post('/api/scrape-json', async (request, reply) => {
		try {
			const { url, selector, country } = request.body;

			if (!url) {
				return reply.code(400).send({ error: 'Missing url in body' });
			}

			const html = await fetchWithRotatingIP(url, { country: country || 'US' });

			// Optional: Parse with selector
			if (selector) {
				// Would need cheerio or jsdom for parsing
				// This is a placeholder
				return reply.send({
					url,
					selector,
					message: 'HTML parsing requires additional dependencies',
					html: html.substring(0, 500) + '...',
				});
			}

			return reply.send({
				url,
				status: 'success',
				htmlLength: html.length,
			});
		} catch (error) {
			return reply.code(500).send({ error: error.message });
		}
	});

	console.log('[ScraperAPI] Integration setup complete');
}

export default {
	fetchWithRotatingIP,
	fetchFromCountry,
	fetchRendered,
	getCacheStats,
	clearCache,
	setupScraperAPI,
};
