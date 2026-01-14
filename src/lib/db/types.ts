// Generated types from Supabase - run `supabase gen types typescript` to update
// For now, using manual types that match our schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			articles: {
				Row: {
					id: string;
					user_id: string;
					title: string;
					url: string | null;
					publication: string | null;
					published_at: string | null;
					status: 'draft' | 'published' | 'archived';
					notes: string | null;
					tags: string[];
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					title: string;
					url?: string | null;
					publication?: string | null;
					published_at?: string | null;
					status?: 'draft' | 'published' | 'archived';
					notes?: string | null;
					tags?: string[];
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					title?: string;
					url?: string | null;
					publication?: string | null;
					published_at?: string | null;
					status?: 'draft' | 'published' | 'archived';
					notes?: string | null;
					tags?: string[];
					created_at?: string;
					updated_at?: string;
				};
			};
			sources: {
				Row: {
					id: string;
					user_id: string;
					type: 'webpage' | 'pdf' | 'youtube' | 'document' | 'image';
					url: string;
					title: string;
					description: string | null;
					author: string | null;
					source_date: string | null;
					tags: string[];
					metadata: Json;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					type: 'webpage' | 'pdf' | 'youtube' | 'document' | 'image';
					url: string;
					title: string;
					description?: string | null;
					author?: string | null;
					source_date?: string | null;
					tags?: string[];
					metadata?: Json;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					type?: 'webpage' | 'pdf' | 'youtube' | 'document' | 'image';
					url?: string;
					title?: string;
					description?: string | null;
					author?: string | null;
					source_date?: string | null;
					tags?: string[];
					metadata?: Json;
					created_at?: string;
					updated_at?: string;
				};
			};
			archive_records: {
				Row: {
					id: string;
					user_id: string;
					archivable_type: 'article' | 'source';
					archivable_id: string;
					archive_url: string | null;
					archive_timestamp: string | null;
					status: 'pending' | 'processing' | 'completed' | 'failed';
					job_id: string | null;
					error_message: string | null;
					requested_at: string;
					completed_at: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					archivable_type: 'article' | 'source';
					archivable_id: string;
					archive_url?: string | null;
					archive_timestamp?: string | null;
					status?: 'pending' | 'processing' | 'completed' | 'failed';
					job_id?: string | null;
					error_message?: string | null;
					requested_at?: string;
					completed_at?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					archivable_type?: 'article' | 'source';
					archivable_id?: string;
					archive_url?: string | null;
					archive_timestamp?: string | null;
					status?: 'pending' | 'processing' | 'completed' | 'failed';
					job_id?: string | null;
					error_message?: string | null;
					requested_at?: string;
					completed_at?: string | null;
					created_at?: string;
				};
			};
			local_downloads: {
				Row: {
					id: string;
					user_id: string;
					downloadable_type: 'article' | 'source';
					downloadable_id: string;
					storage_path: string;
					file_size_bytes: number | null;
					file_hash: string | null;
					mime_type: string | null;
					download_type: 'html' | 'mhtml' | 'pdf' | 'video' | 'screenshot' | 'original';
					downloaded_at: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					downloadable_type: 'article' | 'source';
					downloadable_id: string;
					storage_path: string;
					file_size_bytes?: number | null;
					file_hash?: string | null;
					mime_type?: string | null;
					download_type: 'html' | 'mhtml' | 'pdf' | 'video' | 'screenshot' | 'original';
					downloaded_at?: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					downloadable_type?: 'article' | 'source';
					downloadable_id?: string;
					storage_path?: string;
					file_size_bytes?: number | null;
					file_hash?: string | null;
					mime_type?: string | null;
					download_type?: 'html' | 'mhtml' | 'pdf' | 'video' | 'screenshot' | 'original';
					downloaded_at?: string;
					created_at?: string;
				};
			};
			collections: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					description: string | null;
					color: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					description?: string | null;
					color?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					name?: string;
					description?: string | null;
					color?: string;
					created_at?: string;
					updated_at?: string;
				};
			};
			citations: {
				Row: {
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
					metadata: Json;
					citation_json_url: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					sha256: string;
					hashkey?: string | null;
					citing_url: string;
					cited_url: string;
					citing_quote?: string | null;
					cited_quote?: string | null;
					citing_context_before?: string | null;
					citing_context_after?: string | null;
					cited_context_before?: string | null;
					cited_context_after?: string | null;
					article_id?: string | null;
					source_id?: string | null;
					metadata?: Json;
					citation_json_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					sha256?: string;
					hashkey?: string | null;
					citing_url?: string;
					cited_url?: string;
					citing_quote?: string | null;
					cited_quote?: string | null;
					citing_context_before?: string | null;
					citing_context_after?: string | null;
					cited_context_before?: string | null;
					cited_context_after?: string | null;
					article_id?: string | null;
					source_id?: string | null;
					metadata?: Json;
					citation_json_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
		};
	};
};
