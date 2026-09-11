# On-prem vehicle compliance document storage

Vehicle ownership, insurance, and IVM files are stored outside the public web directory. By default the application uses `data/vehicle-documents` under the application working directory. Set `VEHICLE_DOCUMENTS_DIR` to an absolute path to place them on a dedicated persistent volume.

The web server must have read/write access to that directory. Do not expose it through nginx or another static file server: the application download endpoint enforces vehicle-view permissions.

## Deployment

1. Apply `sql/add_vehicle_compliance_documents.sql` to the PostgreSQL database.
2. Create the storage directory, owned by the account running the application, with mode `0750`.
3. Optionally set `VEHICLE_DOCUMENTS_DIR` in the application environment.
4. Restart the application.

## Backup and restore

Back up both PostgreSQL and the entire document directory in the same backup window. The database contains the file metadata while the directory contains the binaries; neither backup is complete alone.

For a consistent restore, stop uploads (or stop the application), restore the database dump and document directory from the same backup set, preserve filenames and permissions, then start the application. Include the directory in off-host backups and test restoration periodically.