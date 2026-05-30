# Database Audit Report

## Schema

Tables:

- `Employee`
- `Attendance`
- `SyncQueue`
- `schema_migrations`

Relationships:

- `Attendance.employee_id` references `Employee.employee_id`.
- `SyncQueue.attendance_id` references `Attendance.attendance_id`.

## Findings And Fixes

- Foreign keys were enabled only in `open()` via an async call that was not awaited.
  - Fix: `runMigrations()` now also awaits `PRAGMA foreign_keys = ON`.
- Demo attendance used `EMP-9021` without a guaranteed employee row.
  - Fix: `AppProvider` seeds `EMP-9021` after migrations.
- `VerificationTransactionService.queueTransaction()` writes `Attendance` and `SyncQueue` in one `DatabaseService.runInTransaction()` block.
  - Status: This is the correct atomic boundary for attendance plus queue creation.
- Repository API usage matches the schema for `AttendanceRepository`, `EmployeeRepository`, and `SyncQueueRepository`.

## Current Status

Database initialization, migration, demo identity seeding, attendance insertion, and queue insertion have a valid schema path.

