export const initialMigration = [
  `CREATE TABLE IF NOT EXISTS Employee (
    employee_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    embedding_hash BLOB NOT NULL,
    embedding_version INTEGER NOT NULL,
    last_sync_timestamp TEXT,
    last_used_at TEXT,
    created_at TEXT,
    updated_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_employee_project_id ON Employee(project_id);`,
  `CREATE TABLE IF NOT EXISTS Attendance (
    attendance_id TEXT PRIMARY KEY,
    uuid TEXT,
    employee_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    gps_lat REAL,
    gps_lon REAL,
    verification_score REAL,
    status TEXT,
    sync_status TEXT,
    remote_id TEXT,
    sync_error TEXT,
    previous_hash TEXT,
    record_hash TEXT,
    signature TEXT,
    created_at TEXT,
    FOREIGN KEY(employee_id) REFERENCES Employee(employee_id) ON DELETE RESTRICT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON Attendance(employee_id);`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON Attendance(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_attendance_sync_status ON Attendance(sync_status);`,
  `CREATE TABLE IF NOT EXISTS SyncQueue (
    queue_id TEXT PRIMARY KEY,
    attendance_id TEXT NOT NULL,
    state TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_attempt TEXT,
    next_retry_at TEXT,
    error_message TEXT,
    created_at TEXT,
    FOREIGN KEY(attendance_id) REFERENCES Attendance(attendance_id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_syncqueue_state ON SyncQueue(state);`
];
