# ------------------------------------- Micro Manager -------------------------------------
start-micro-manager:
    {{compose}} up -d \
      mysql-typ-e-db typ-e checkpoint prowl
    -{{compose}} logs -f \
      mysql-typ-e-db typ-e checkpoint prowl

test-micro-manager:
    {{compose}} rm -sf mysql-typ-e-db
    {{compose}} up -d \
      mysql-typ-e-db typ-e checkpoint prowl
    {{compose}} run --rm --use-aliases micro-manager

dev-micro-manager:
    {{compose}} run --rm --service-ports --use-aliases \
      --entrypoint "sh -c 'export COREPACK_ENABLE_DOWNLOAD_PROMPT=0 && corepack enable && corepack prepare yarn@4.12.0 --activate && yarn install --silent && yarn dev'" micro-manager

log-micro-manager:
    {{compose}} logs -f \
      mysql-typ-e-db typ-e checkpoint prowl
