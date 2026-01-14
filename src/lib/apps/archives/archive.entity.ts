import type { ArchiveStatus, ArchivableType } from './archive.schema';
import { parseWaybackTimestamp } from './wayback';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ArchiveRecordRow {
	id: string;
	user_id: string;
	archivable_type: ArchivableType;
	archivable_id: string;
	archive_url: string | null;
	archive_timestamp: string | null;
	status: ArchiveStatus;
	job_id: string | null;
	error_message: string | null;
	requested_at: string;
	completed_at: string | null;
	created_at: string;
}

// ============================================================================
// Entity Functions (Pure - No DB Calls)
// ============================================================================

export const ArchiveRecord = {
	/**
	 * Check if the archive is complete
	 */
	isComplete(record: ArchiveRecordRow): boolean {
		return record.status === 'completed' && record.archive_url !== null;
	},

	/**
	 * Check if the archive is pending
	 */
	isPending(record: ArchiveRecordRow): boolean {
		return record.status === 'pending' || record.status === 'processing';
	},

	/**
	 * Check if the archive failed
	 */
	isFailed(record: ArchiveRecordRow): boolean {
		return record.status === 'failed';
	},

	/**
	 * Check if the archive can be retried
	 */
	canRetry(record: ArchiveRecordRow): boolean {
		return record.status === 'failed';
	},

	/**
	 * Get the archive timestamp as a Date object
	 */
	getArchiveDate(record: ArchiveRecordRow): Date | null {
		if (!record.archive_timestamp) return null;

		// Try parsing as Wayback timestamp first
		const waybackDate = parseWaybackTimestamp(record.archive_timestamp);
		if (waybackDate) return waybackDate;

		// Fall back to ISO date parsing
		const isoDate = new Date(record.archive_timestamp);
		return isNaN(isoDate.getTime()) ? null : isoDate;
	},

	/**
	 * Format the archive date for display
	 */
	formatArchiveDate(record: ArchiveRecordRow): string | null {
		const date = ArchiveRecord.getArchiveDate(record);
		if (!date) return null;

		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	},

	/**
	 * Get relative time since archive was requested
	 */
	formatRelativeRequestTime(record: ArchiveRecordRow): string {
		const diffMs = Date.now() - new Date(record.requested_at).getTime();
		const diffMinutes = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMinutes < 1) return 'Just now';
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return 'Yesterday';
		return `${diffDays} days ago`;
	},

	/**
	 * Get status display label
	 */
	getStatusLabel(record: ArchiveRecordRow): string {
		const labels: Record<ArchiveStatus, string> = {
			pending: 'Pending',
			processing: 'Archiving...',
			completed: 'Archived',
			failed: 'Failed'
		};
		return labels[record.status];
	},

	/**
	 * Get status color class (for Tailwind)
	 */
	getStatusColor(record: ArchiveRecordRow): string {
		const colors: Record<ArchiveStatus, string> = {
			pending: 'text-yellow-600 bg-yellow-50',
			processing: 'text-blue-600 bg-blue-50',
			completed: 'text-green-600 bg-green-50',
			failed: 'text-red-600 bg-red-50'
		};
		return colors[record.status];
	},

	/**
	 * Check if user can view this archive record
	 */
	canBeViewedBy(record: ArchiveRecordRow, userId: string): boolean {
		return record.user_id === userId;
	},

	/**
	 * Get how long the archive took (if completed)
	 */
	getDuration(record: ArchiveRecordRow): string | null {
		if (!record.completed_at) return null;

		const requestedAt = new Date(record.requested_at).getTime();
		const completedAt = new Date(record.completed_at).getTime();
		const durationMs = completedAt - requestedAt;

		if (durationMs < 1000) return 'Less than 1 second';
		if (durationMs < 60000) return `${Math.floor(durationMs / 1000)} seconds`;
		if (durationMs < 3600000) return `${Math.floor(durationMs / 60000)} minutes`;
		return `${Math.floor(durationMs / 3600000)} hours`;
	}
};
