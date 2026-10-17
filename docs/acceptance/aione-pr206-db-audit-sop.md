# PR #206 — Cloud SQL migration inventory evidence

This read-only SQL audit complements (does not replace) the Node repository-to-database migration inventory checker. It does not perform a schema migration or create a store.

To inspect the CURRENT Cloud SQL database, in Cloud Shell check out the reviewed PR #206 commit and connect as the previously verified AIONE database account:

```bash
gcloud sql connect aione-pg-dev --user=aione_app --database=aione --project=miwa-aione
```

At the `aione=>` psql prompt run the audit SQL file using its **absolute** path (psql's `\i` resolves the filename from the local Cloud Shell environment):

```text
\i /home/info/aione-pr206-preview/data-code/audits/PR206_CURRENT_MIGRATION_READONLY.sql
```

The above home path is illustrative: run `pwd` in Cloud Shell before connecting to confirm the absolute file location; substitute the actual path. Do not assume `/home/info` on other accounts.

The audit prints the schema migration registry, existing product tables, canonical store registry presence, and registered versions. The Node checker performs the actual Repo-to-database comparison and rejects unapplied/unknown migrations. Do not interpret the SQL audit as migration approval.

Release MUST be blocked unless every unapplied migration is reviewed against the true live schema and a backup/rollback plan and business approval are documented. Do not run `npm run db:migrate` on live CURRENT simply because the Preview succeeds.
