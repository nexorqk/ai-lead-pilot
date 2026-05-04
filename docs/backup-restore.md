# Backup and Restore

Backups use PostgreSQL logical dumps in custom format:

```bash
DATABASE_URL=postgresql://... BACKUP_DIR=/secure/backups infra/scripts/backup-db.sh
```

Restore is intentionally guarded:

```bash
CONFIRM_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_DATA DATABASE_URL=postgresql://... infra/scripts/restore-db.sh /secure/backups/file.dump
```

Rules:

- Do not hardcode database passwords in scripts.
- Test restore against staging before production.
- Keep backups outside the repository.
- Restrict backup file permissions.
- Document the latest successful restore drill.

Current RPO/RTO are not committed because automated backup scheduling is not implemented yet.
