/**
 * Archive.org Wayback Machine API Client
 *
 * Handles interactions with the Wayback Machine for archiving URLs.
 *
 * Rate Limits:
 * - Authenticated: ~15 requests/minute
 * - Unauthenticated: ~5 requests/minute
 *
 * @see https://web.archive.org/
 */

const DEFAULT_USER_AGENT =
	'TimsArchiver/1.0 (https://github.com/tims-archiver; journalist archival tool)';

// ============================================================================
// Types
// ============================================================================

export interface WaybackConfig {
	accessKey?: string;
	secretKey?: string;
	userAgent?: string;
}

export interface SavePageResult {
	success: boolean;
	jobId?: string;
	archiveUrl?: string;
	timestamp?: string;
	error?: string;
}

export interface AvailabilityResult {
	available: boolean;
	url?: string;
	timestamp?: string;
	closestSnapshot?: {
		status: string;
		available: boolean;
		url: string;
		timestamp: string;
	};
}

export interface Snapshot {
	timestamp: string;
	url: string;
	mimeType: string;
	statusCode: string;
}

// ============================================================================
// Wayback Machine Client
// ============================================================================

/**
 * Create a Wayback Machine client
 */
export function createWaybackClient(config: WaybackConfig = {}) {
	const { accessKey, secretKey, userAgent = DEFAULT_USER_AGENT } = config;

	return {
		/**
		 * Check if a URL has been archived on the Wayback Machine
		 */
		async checkAvailability(url: string): Promise<AvailabilityResult> {
			const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;

			try {
				const response = await fetch(apiUrl, {
					headers: { 'User-Agent': userAgent }
				});

				if (!response.ok) {
					return { available: false };
				}

				const data = (await response.json()) as {
					archived_snapshots?: {
						closest?: {
							status: string;
							available: boolean;
							url: string;
							timestamp: string;
						};
					};
				};

				const closest = data.archived_snapshots?.closest;

				if (closest?.available) {
					return {
						available: true,
						url: closest.url,
						timestamp: closest.timestamp,
						closestSnapshot: closest
					};
				}

				return { available: false };
			} catch (error) {
				console.error('Failed to check Wayback availability:', error);
				return { available: false };
			}
		},

		/**
		 * Submit a URL to be archived using the Save Page Now (SPN) API
		 */
		async savePage(url: string): Promise<SavePageResult> {
			const saveUrl = `https://web.archive.org/save/${url}`;

			try {
				const response = await fetch(saveUrl, {
					method: 'GET',
					headers: { 'User-Agent': userAgent },
					redirect: 'manual'
				});

				// SPN redirects to the archived URL on success
				if (response.status === 302 || response.status === 301) {
					const archiveUrl = response.headers.get('location');
					if (archiveUrl) {
						const timestampMatch = archiveUrl.match(/web\.archive\.org\/web\/(\d{14})/);
						return {
							success: true,
							archiveUrl,
							timestamp: timestampMatch?.[1]
						};
					}
				}

				// Rate limiting
				if (response.status === 429) {
					return {
						success: false,
						error: 'Rate limited. Please try again later.'
					};
				}

				// Error response
				if (!response.ok) {
					return {
						success: false,
						error: `HTTP ${response.status}: ${response.statusText}`
					};
				}

				// Parse 200 response for archive URL
				const text = await response.text();
				const urlMatch = text.match(/https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<]+/);

				if (urlMatch) {
					const archiveUrl = urlMatch[0];
					const timestampMatch = archiveUrl.match(/\/web\/(\d{14})\//);
					return {
						success: true,
						archiveUrl,
						timestamp: timestampMatch?.[1]
					};
				}

				return {
					success: false,
					error: 'Unable to parse archive response'
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		},

		/**
		 * Save page using authenticated SPN2 API (higher rate limits)
		 */
		async savePageV2(
			url: string,
			options: {
				captureAll?: boolean;
				captureOutlinks?: boolean;
				captureScreenshot?: boolean;
				skipFirstArchive?: boolean;
			} = {}
		): Promise<SavePageResult> {
			if (!accessKey || !secretKey) {
				// Fall back to simple API
				return this.savePage(url);
			}

			const formData = new URLSearchParams();
			formData.append('url', url);

			if (options.captureAll) formData.append('capture_all', '1');
			if (options.captureOutlinks) formData.append('capture_outlinks', '1');
			if (options.captureScreenshot) formData.append('capture_screenshot', '1');
			if (options.skipFirstArchive) formData.append('skip_first_archive', '1');

			try {
				const response = await fetch('https://web.archive.org/save', {
					method: 'POST',
					headers: {
						'User-Agent': userAgent,
						Authorization: `LOW ${accessKey}:${secretKey}`,
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: formData.toString()
				});

				if (response.status === 429) {
					return { success: false, error: 'Rate limited. Please try again later.' };
				}

				const data = (await response.json()) as {
					job_id?: string;
					url?: string;
					timestamp?: string;
					message?: string;
				};

				if (data.job_id) {
					return { success: true, jobId: data.job_id };
				}

				if (data.url && data.timestamp) {
					return {
						success: true,
						archiveUrl: `https://web.archive.org/web/${data.timestamp}/${data.url}`,
						timestamp: data.timestamp
					};
				}

				return { success: false, error: data.message ?? 'Unknown error' };
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		},

		/**
		 * Check status of an SPN2 job
		 */
		async checkJobStatus(
			jobId: string
		): Promise<{ status: 'pending' | 'success' | 'error'; archiveUrl?: string; error?: string }> {
			if (!accessKey || !secretKey) {
				return { status: 'error', error: 'Authentication required' };
			}

			try {
				const response = await fetch(`https://web.archive.org/save/status/${jobId}`, {
					headers: {
						'User-Agent': userAgent,
						Authorization: `LOW ${accessKey}:${secretKey}`
					}
				});

				const data = (await response.json()) as {
					status?: string;
					timestamp?: string;
					original_url?: string;
					message?: string;
				};

				if (data.status === 'success' && data.timestamp && data.original_url) {
					return {
						status: 'success',
						archiveUrl: `https://web.archive.org/web/${data.timestamp}/${data.original_url}`
					};
				}

				if (data.status === 'pending') {
					return { status: 'pending' };
				}

				return { status: 'error', error: data.message ?? 'Archive failed' };
			} catch (error) {
				return {
					status: 'error',
					error: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		},

		/**
		 * Get all archived snapshots of a URL
		 */
		async getSnapshots(
			url: string,
			options: { from?: string; to?: string; limit?: number } = {}
		): Promise<Snapshot[]> {
			const params = new URLSearchParams({
				url,
				output: 'json',
				fl: 'timestamp,original,mimetype,statuscode',
				collapse: 'timestamp:8'
			});

			if (options.from) params.append('from', options.from);
			if (options.to) params.append('to', options.to);
			if (options.limit) params.append('limit', options.limit.toString());

			try {
				const response = await fetch(`https://web.archive.org/cdx/search/cdx?${params}`, {
					headers: { 'User-Agent': userAgent }
				});

				if (!response.ok) return [];

				const data = (await response.json()) as string[][];

				return data.slice(1).map(([timestamp, original, mimetype, statuscode]) => ({
					timestamp,
					url: `https://web.archive.org/web/${timestamp}/${original}`,
					mimeType: mimetype,
					statusCode: statuscode
				}));
			} catch {
				return [];
			}
		}
	};
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a Wayback Machine timestamp (YYYYMMDDHHmmss) to Date
 */
export function parseWaybackTimestamp(timestamp: string): Date | null {
	if (timestamp.length !== 14) return null;

	const year = parseInt(timestamp.slice(0, 4), 10);
	const month = parseInt(timestamp.slice(4, 6), 10) - 1;
	const day = parseInt(timestamp.slice(6, 8), 10);
	const hour = parseInt(timestamp.slice(8, 10), 10);
	const minute = parseInt(timestamp.slice(10, 12), 10);
	const second = parseInt(timestamp.slice(12, 14), 10);

	return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Format a Date as a Wayback Machine timestamp
 */
export function formatWaybackTimestamp(date: Date): string {
	return (
		date.getUTCFullYear().toString() +
		(date.getUTCMonth() + 1).toString().padStart(2, '0') +
		date.getUTCDate().toString().padStart(2, '0') +
		date.getUTCHours().toString().padStart(2, '0') +
		date.getUTCMinutes().toString().padStart(2, '0') +
		date.getUTCSeconds().toString().padStart(2, '0')
	);
}

/**
 * Build a Wayback Machine URL for a given timestamp and URL
 */
export function buildWaybackUrl(timestamp: string, originalUrl: string): string {
	return `https://web.archive.org/web/${timestamp}/${originalUrl}`;
}
