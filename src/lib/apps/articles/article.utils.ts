/**
 * Utilities for parsing and enriching article URLs
 */

// Known mirror/demo site prefixes that embed the real URL in the path
const MIRROR_HOSTS = ['demo-sites.citeit.net', 'pages.citeit.net'];

export interface ParsedArticleUrl {
	originalUrl: string;
	realDomain: string;
	realUrl: string | null; // The reconstructed original URL if possible
	isMirror: boolean;
}

/**
 * Parse an article URL to extract the real domain and original URL
 *
 * Examples:
 * - https://demo-sites.citeit.net/www.racket.news/p/article -> realDomain: "racket.news", realUrl: "https://www.racket.news/p/article"
 * - https://example.com/article -> realDomain: "example.com", realUrl: null (already original)
 */
export function parseArticleUrl(url: string): ParsedArticleUrl {
	try {
		const parsed = new URL(url);
		const host = parsed.hostname.toLowerCase();

		// Check if this is a known mirror site
		if (MIRROR_HOSTS.includes(host)) {
			// The path contains the real URL, e.g., /www.racket.news/p/article
			const pathParts = parsed.pathname.split('/').filter(Boolean);

			if (pathParts.length > 0) {
				const embeddedDomain = pathParts[0];
				const remainingPath = '/' + pathParts.slice(1).join('/');

				// Clean up domain (remove www. for display)
				const realDomain = embeddedDomain.replace(/^www\./, '');

				// Reconstruct the original URL (assume https)
				const realUrl = `https://${embeddedDomain}${remainingPath}`;

				return {
					originalUrl: url,
					realDomain,
					realUrl,
					isMirror: true
				};
			}
		}

		// Not a mirror - return the domain as-is
		return {
			originalUrl: url,
			realDomain: parsed.hostname.replace(/^www\./, ''),
			realUrl: null,
			isMirror: false
		};
	} catch {
		// Invalid URL
		return {
			originalUrl: url,
			realDomain: 'unknown',
			realUrl: null,
			isMirror: false
		};
	}
}

/**
 * Fetch the title from a URL by parsing the HTML
 */
export async function fetchPageTitle(url: string): Promise<string | null> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; TimsArchiver/1.0)',
				'Accept': 'text/html'
			}
		});

		clearTimeout(timeout);

		if (!response.ok) {
			return null;
		}

		const html = await response.text();

		// Extract title from HTML
		// Try <title> tag first
		const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		if (titleMatch) {
			return cleanTitle(titleMatch[1]);
		}

		// Try og:title meta tag
		const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
		if (ogTitleMatch) {
			return cleanTitle(ogTitleMatch[1]);
		}

		// Try twitter:title meta tag
		const twitterTitleMatch = html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i);
		if (twitterTitleMatch) {
			return cleanTitle(twitterTitleMatch[1]);
		}

		return null;
	} catch (err) {
		console.error(`Failed to fetch title from ${url}:`, err);
		return null;
	}
}

/**
 * Clean up a title string
 */
function cleanTitle(title: string): string {
	return title
		.trim()
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.slice(0, 500); // Limit length
}

/**
 * Extract publication name from domain
 * e.g., "racket.news" -> "Racket News"
 */
export function domainToPublicationName(domain: string): string {
	// Remove common TLDs and format nicely
	const name = domain
		.replace(/\.(com|org|net|news|co|io|me|tv|info)$/i, '')
		.replace(/\./g, ' ')
		.replace(/-/g, ' ')
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');

	return name;
}
