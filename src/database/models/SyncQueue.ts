export interface SyncQueue {
  queue_id: string;
  attendance_id: string;
  state: string;
  retry_count?: number;
  last_attempt?: string | null;
  next_retry_at?: string | null;
  error_message?: string | null;
  created_at?: string | null;
}
