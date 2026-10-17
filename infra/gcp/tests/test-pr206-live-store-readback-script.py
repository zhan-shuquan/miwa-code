from pathlib import Path
root=Path(__file__).resolve().parents[3]
s=(root/'infra/gcp/automation/VERIFY_PR206_STORES_READ_ONLY.sh').read_text()
for text in ['api/v1/shared-parameters','storeCatalog','platform_status','inactive','401','403','200']:
 assert text in s
for forbidden in ['db:migrate','gcloud run deploy','gcloud sql connect','update-traffic','INSERT INTO','PATCH','POST']:
 assert forbidden not in s
print('PASS store live-read script uses only GET and denies unsafe results')
