// Schema exports
export {
	CiteItJsonSchema,
	CitationSchema,
	CitationPartialSchema,
	ImportCitationSchema,
	BulkImportSchema
} from './citation.schema';
export type {
	CiteItJson,
	CitationInput,
	CitationPartialInput,
	ImportCitationInput,
	BulkImportInput
} from './citation.schema';

// Entity exports
export { Citation } from './citation.entity';
export type { CitationRow, CitationWithRelations } from './citation.entity';

// Service exports
export { CitationService } from './citation.service';
export type { CitationListOptions, ImportResult, BulkImportProgress } from './citation.service';
