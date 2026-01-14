// ============================================================================
// Type Definitions
// ============================================================================

export interface CitationRow {
	id: string;
	user_id: string;
	sha256: string;
	hashkey: string | null;
	citing_url: string;
	cited_url: string;
	citing_quote: string | null;
	cited_quote: string | null;
	citing_context_before: string | null;
	citing_context_after: string | null;
	cited_context_before: string | null;
	cited_context_after: string | null;
	article_id: string | null;
	source_id: string | null;
	metadata: Record<string, unknown>;
	citation_json_url: string | null;
	created_at: string;
	updated_at: string;
}

export interface CitationWithRelations extends CitationRow {
	article?: {
		id: string;
		title: string;
		url: string | null;
	} | null;
	source?: {
		id: string;
		title: string;
		url: string;
		type: string;
	} | null;
}

// ============================================================================
// Entity Functions (Pure - No DB Calls)
// ============================================================================

export const Citation = {
	/**
	 * Get domain from citing URL
	 */
	getCitingDomain(citation: CitationRow): string {
		try {
			return new URL(citation.citing_url).hostname.replace(/^www\./, '');
		} catch {
			return 'unknown';
		}
	},

	/**
	 * Get domain from cited URL
	 */
	getCitedDomain(citation: CitationRow): string {
		try {
			return new URL(citation.cited_url).hostname.replace(/^www\./, '');
		} catch {
			return 'unknown';
		}
	},

	/**
	 * Check if citation has quote text
	 */
	hasQuote(citation: CitationRow): boolean {
		return (
			(citation.citing_quote !== null && citation.citing_quote.trim().length > 0) ||
			(citation.cited_quote !== null && citation.cited_quote.trim().length > 0)
		);
	},

	/**
	 * Get a truncated preview of the quote
	 */
	getQuotePreview(citation: CitationRow, maxLength = 150): string {
		const quote = citation.citing_quote || citation.cited_quote || '';
		if (quote.length <= maxLength) return quote;
		return quote.slice(0, maxLength).trim() + '...';
	},

	/**
	 * Check if citation has context
	 */
	hasContext(citation: CitationRow): boolean {
		return (
			(citation.citing_context_before !== null && citation.citing_context_before.trim().length > 0) ||
			(citation.citing_context_after !== null && citation.citing_context_after.trim().length > 0) ||
			(citation.cited_context_before !== null && citation.cited_context_before.trim().length > 0) ||
			(citation.cited_context_after !== null && citation.cited_context_after.trim().length > 0)
		);
	},

	/**
	 * Check if citation is linked to article record
	 */
	hasLinkedArticle(citation: CitationRow): boolean {
		return citation.article_id !== null;
	},

	/**
	 * Check if citation is linked to source record
	 */
	hasLinkedSource(citation: CitationRow): boolean {
		return citation.source_id !== null;
	},

	/**
	 * Format relative time since citation was added
	 */
	formatRelativeTime(citation: CitationRow): string {
		const diffMs = Date.now() - new Date(citation.created_at).getTime();
		const diffDays = Math.floor(diffMs / 86400000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffMinutes = Math.floor(diffMs / 60000);

		if (diffMinutes < 1) return 'Just now';
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
		return `${Math.floor(diffDays / 30)} months ago`;
	},

	/**
	 * Get short hash for display
	 */
	getShortHash(citation: CitationRow): string {
		return citation.sha256.slice(0, 8);
	},

	/**
	 * Check if user can edit this citation
	 */
	canBeEditedBy(citation: CitationRow, userId: string): boolean {
		return citation.user_id === userId;
	},

	/**
	 * Clean quote text (normalize whitespace)
	 */
	cleanQuoteText(text: string | null): string {
		if (!text) return '';
		return text.replace(/\s+/g, ' ').trim();
	}
};
