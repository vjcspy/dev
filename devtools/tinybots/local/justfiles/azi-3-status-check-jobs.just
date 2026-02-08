# ------------------------------------- azi-3-status-check-jobs -------------------------------------
dev-azi-3-status-check-jobs:
    {{compose}} run --rm --service-ports  --use-aliases --entrypoint "sh -c 'corepack enable && yarn dev'" azi-3-status-check-jobs
