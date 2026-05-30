export interface Employee {
  employee_id: string;
  project_id: string;
  embedding_hash: Uint8Array | string;
  embedding_version: number;
  last_sync_timestamp?: string | null;
  last_used_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
