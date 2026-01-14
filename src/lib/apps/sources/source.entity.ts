import type { SourceType } from './source.schema';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SourceRow {
	id: string;
	user_id: string;
	type: SourceType;
	url: string;
	title: string;
	description: string | null;
	author: string | null;
	source_date: string | null;
	tags: string[];
	metadata: SourceMetadata;
	created_at: string;
	updated_at: string;
}

// Type-specific metadata
export interface WebpageMetadata {
	domain?: string;
	favicon?: string;
	og_image?: string;
	extracted_text?: string;
}

export interface YouTubeMetadata {
	video_id?: string;
	channel_name?: string;
	channel_id?: string;
	duration_seconds?: number;
	thumbnail_url?: string;
	captions_available?: boolean;
}

export interface PdfMetadata {
	page_count?: number;
	file_size_bytes?: number;
	original_filename?: string;
}

export interface ImageMetadata {
	width?: number;
	height?: number;
	format?: string;
	alt_text?: string;
}

export type SourceMetadata = WebpageMetadata | YouTubeMetadata | PdfMetadata | ImageMetadata | Record<string, unknown>;

// With related data
export interface SourceWithArchiveStatus extends SourceRow {
	archive_status: {
		has_archive_org: boolean;
		archive_url: string | null;
		archived_at: string | null;
		has_local_copy: boolean;
		local_downloads_count: number;
	};
}

// ============================================================================
// Entity Functions (Pure - No DB Calls)
// ============================================================================

export const Source = {
	/**
	 * Extract domain from source URL
	 */
	getDomain(source: SourceRow): string {
		try {
			return new URL(source.url).hostname.replace(/^www\./, '');
		} catch {
			return 'unknown';
		}
	},

	/**
	 * Get favicon URL for the source
	 */
	getFaviconUrl(source: SourceRow): string {
		const metadata = source.metadata as WebpageMetadata;
		if (metadata.favicon) return metadata.favicon;

		// Fallback to Google's favicon service
		const domain = Source.getDomain(source);
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
	},

	/**
	 * Get YouTube thumbnail URL
	 */
	getYouTubeThumbnail(source: SourceRow): string | null {
		if (source.type !== 'youtube') return null;

		const metadata = source.metadata as YouTubeMetadata;
		if (metadata.thumbnail_url) return metadata.thumbnail_url;

		// Fallback to video ID based URL
		if (metadata.video_id) {
			return `https://img.youtube.com/vi/${metadata.video_id}/hqdefault.jpg`;
		}

		return null;
	},

	/**
	 * Format YouTube duration as MM:SS or HH:MM:SS
	 */
	formatYouTubeDuration(source: SourceRow): string | null {
		if (source.type !== 'youtube') return null;

		const metadata = source.metadata as YouTubeMetadata;
		if (!metadata.duration_seconds) return null;

		const hours = Math.floor(metadata.duration_seconds / 3600);
		const minutes = Math.floor((metadata.duration_seconds % 3600) / 60);
		const seconds = metadata.duration_seconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	},

	/**
	 * Check if source has a description
	 */
	hasDescription(source: SourceRow): boolean {
		return source.description !== null && source.description.trim().length > 0;
	},

	/**
	 * Check if user can edit this source
	 */
	canBeEditedBy(source: SourceRow, userId: string): boolean {
		return source.user_id === userId;
	},

	/**
	 * Format relative time since source was added
	 */
	formatRelativeTime(source: SourceRow): string {
		const diffMs = Date.now() - new Date(source.created_at).getTime();
		const diffDays = Math.floor(diffMs / 86400000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffMinutes = Math.floor(diffMs / 60000);

		if (diffMinutes < 1) return 'Just now';
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
		return `${Math.floor(diffDays / 365)} years ago`;
	},

	/**
	 * Format source date (when the source was originally published)
	 */
	formatSourceDate(source: SourceRow): string | null {
		if (!source.source_date) return null;

		return new Date(source.source_date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	},

	/**
	 * Get display label for source type
	 */
	getTypeLabel(source: SourceRow): string {
		const labels: Record<SourceType, string> = {
			webpage: 'Web Page',
			pdf: 'PDF',
			youtube: 'YouTube',
			document: 'Document',
			image: 'Image'
		};
		return labels[source.type];
	},

	/**
	 * Get icon name for source type (for use with icon libraries)
	 */
	getTypeIcon(source: SourceRow): string {
		const icons: Record<SourceType, string> = {
			webpage: 'globe',
			pdf: 'file-text',
			youtube: 'youtube',
			document: 'file',
			image: 'image'
		};
		return icons[source.type];
	},

	/**
	 * Check if source can be archived at archive.org
	 * (Some types like local PDFs might not have public URLs)
	 */
	canBeArchivedAtArchiveOrg(source: SourceRow): boolean {
		try {
			const url = new URL(source.url);
			// Archive.org only works with http/https
			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	},

	/**
	 * Check if source can be downloaded locally
	 */
	canBeDownloadedLocally(source: SourceRow): boolean {
		// All types can be downloaded in some form
		return true;
	},

	/**
	 * Get available download types for this source
	 */
	getAvailableDownloadTypes(source: SourceRow): string[] {
		switch (source.type) {
			case 'webpage':
				return ['html', 'mhtml', 'screenshot', 'pdf'];
			case 'pdf':
				return ['original'];
			case 'youtube':
				return ['video', 'screenshot'];
			case 'image':
				return ['original'];
			case 'document':
				return ['original'];
			default:
				return ['original'];
		}
	}
};
