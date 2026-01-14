// Schema exports
export {
	RequestArchiveSchema,
	UpdateArchiveRecordSchema,
	archiveStatuses,
	archivableTypes
} from './archive.schema';
export type {
	ArchiveStatus,
	ArchivableType,
	RequestArchiveInput,
	UpdateArchiveRecordInput
} from './archive.schema';

// Entity exports
export { ArchiveRecord } from './archive.entity';
export type { ArchiveRecordRow } from './archive.entity';

// Service exports
export { ArchiveService, configureWayback } from './archive.service';
export type { ArchiveListOptions } from './archive.service';

// Wayback Machine client
export {
	createWaybackClient,
	parseWaybackTimestamp,
	formatWaybackTimestamp,
	buildWaybackUrl
} from './wayback';
export type { WaybackConfig, SavePageResult, AvailabilityResult, Snapshot } from './wayback';
