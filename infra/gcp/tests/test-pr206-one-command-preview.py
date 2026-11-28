"""Static confinement for one-command PR #206 preview; no cloud access."""
from pathlib import Path
root=Path(__file__).resolve().parents[3]
p=root/'infra/gcp/automation/RUN_PR206_PREVIEW_ONCE.sh'
s=p.read_text()
assert 'feat/shared-settings-center-20261015' in s
assert 'refs/heads/$branch' in s
assert 'reviewed_sha' in s and 'remote_sha' in s
assert 'PREVIEW_CURRENT_SETTINGS_BACKEND.sh' in s
assert 'VERIFY_CURRENT_SETTINGS_PREVIEW_READ_ONLY.sh' in s
assert s.index('PREVIEW_CURRENT_SETTINGS_BACKEND.sh') < s.index('VERIFY_CURRENT_SETTINGS_PREVIEW_READ_ONLY.sh')
assert 'gcloud run deploy' not in s and 'gcloud sql' not in s
print('PASS: one-command PR preview pinned to reviewed SHA and existing CURRENT pipeline')
