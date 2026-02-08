# ------------------------------------- Atlas -------------------------------------

# Start all Atlas dependencies (for development/debugging)
start-atlas:
    {{compose}} up -d \
      mysql-typ-e-db typ-e mysql-atlas-intelligence-db intelligence
    -{{compose}} logs -f \
      mysql-typ-e-db typ-e mysql-atlas-intelligence-db intelligence

# Run Atlas integration tests (resets DBs for clean state)
test-atlas:
    {{compose}} rm -sf mysql-typ-e-db mysql-atlas-intelligence-db
    {{compose}} up -d \
      mysql-typ-e-db typ-e mysql-atlas-intelligence-db intelligence
    {{compose}} run --rm --use-aliases atlas
