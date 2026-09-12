# CURRENT health authentication note

Status: operational guardrail

For manual/Cloud Shell CURRENT operations, `gcloud auth print-identity-token` must match the credential type:

- human Google account: use the generic gcloud identity token without `--audiences` for direct Cloud Run developer invocation
- service account: use an audience-bound identity token with the Cloud Run service URL

The CURRENT deploy Cloud Build runs as a service account, so its audience-bound token remains correct. The manually reviewed migration action can run under a human control account and must not force the service-account token form.
