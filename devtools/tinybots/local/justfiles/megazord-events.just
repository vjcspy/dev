# ------------------------------------- Megazord Events. -------------------------------------
dev-megazord-events:
    {{compose}} run --rm --service-ports  --use-aliases --entrypoint "sh -c 'corepack enable && yarn start'" megazord-events

debug-megazord-events:
    {{compose}} run --rm --service-ports  --use-aliases --entrypoint "sh -c 'corepack enable && yarn dev'" megazord-events

start-megazord-events:
    {{compose}} up -d \
      mysql-typ-e-db typ-e mysql-wonkers-db wonkers-db localstack checkpoint prowl wonkers wonkers-account

test-megazord-events:
    {{compose}} rm -sf mysql-typ-e-db mysql-wonkers-db localstack
    {{compose}} up -d \
      mysql-typ-e-db mysql-wonkers-db localstack checkpoint prowl wonkers wonkers-account wonkers-db
    {{compose}} run --rm --use-aliases megazord-events

log-megazord-events:
    -{{compose}} logs -f \
          mysql-typ-e-db typ-e mysql-wonkers-db wonkers-db localstack checkpoint prowl wonkers wonkers-account
