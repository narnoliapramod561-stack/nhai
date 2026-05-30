export interface Attendance {
  attendance_id: string;
  uuid?: string | null;
  employee_id: string;
  timestamp: string;
  gps_lat?: number | null;
  gps_lon?: number | null;
  verification_score?: number | null;
  status?: string | null;
  sync_status?: string | null;
  remote_id?: string | null;
  sync_error?: string | null;
  previous_hash?: string | null;
  record_hash?: string | null;
  signature?: string | null;
  created_at?: string | null;
}
