# ------------------------------------- m-o-triggers -------------------------------------
test-m-o-triggers:
    {{compose}} rm -sf mysql-typ-e-db mysql-wonkers-db localstack
    {{compose}} up -d \
      mysql-typ-e-db mysql-wonkers-db localstack checkpoint prowl
    {{compose}} run --rm --use-aliases m-o-triggers
