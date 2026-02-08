# ------------------------------------- Sensara Adaptor -------------------------------------

# Start dependencies for development
start-sensara-adaptor:
    {{compose}} up -d \
      mysql-typ-e-db typ-e mysql-wonkers-db wonkers-db mysql-atlas-intelligence-db intelligence wonkers wonkers-account
    -{{compose}} logs -f \
      mysql-typ-e-db typ-e mysql-wonkers-db wonkers-db mysql-atlas-intelligence-db intelligence wonkers wonkers-account

# Run integration tests with clean DB
test-sensara-adaptor:
    {{compose}} rm -sf mysql-typ-e-db mysql-wonkers-db mysql-atlas-intelligence-db
    {{compose}} up -d \
      mysql-typ-e-db typ-e mysql-wonkers-db wonkers-db mysql-atlas-intelligence-db intelligence wonkers wonkers-account
    {{compose}} run --rm --use-aliases sensara-adaptor

# View logs
log-sensara-adaptor:
    {{compose}} logs -f \
      mysql-typ-e-db typ-e mysql-wonkers-db wonkers-db mysql-atlas-intelligence-db intelligence wonkers wonkers-account

# Development mode
dev-sensara-adaptor:
    {{compose}} run --rm --service-ports --use-aliases \
      --entrypoint "sh -c 'corepack enable && yarn dev'" sensara-adaptor

# Debug mode with inspector
debug-sensara-adaptor:
    {{compose}} run --rm --service-ports --use-aliases \
      --entrypoint "sh -c 'corepack enable && yarn debug'" sensara-adaptor
