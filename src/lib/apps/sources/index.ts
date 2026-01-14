// Schema exports
export {
	SourceSchema,
	SourcePartialSchema,
	QuickAddSourceSchema,
	sourceTypes,
	detectSourceType,
	extractYouTubeVideoId
} from './source.schema';
export type { SourceType, SourceInput, SourcePartialInput, QuickAddSourceInput } from './source.schema';

// Entity exports
export { Source } from './source.entity';
export type {
	SourceRow,
	SourceWithArchiveStatus,
	SourceMetadata,
	WebpageMetadata,
	YouTubeMetadata,
	PdfMetadata,
	ImageMetadata
} from './source.entity';

// Service exports
export { SourceService } from './source.service';
export type { SourceListOptions } from './source.service';
