start-eve:
    {{compose}} up -d \
      mysql-typ-e-db typ-e checkpoint prowl
    -{{compose}} logs -f \
      mysql-typ-e-db typ-e checkpoint prowl

test-eve:
    {{compose}} rm -sf mysql-typ-e-db
    {{compose}} up -d \
      mysql-typ-e-db typ-e checkpoint prowl
    {{compose}} run --rm --use-aliases eve

log-eve:
    {{compose}} logs -f \
      mysql-typ-e-db typ-e checkpoint prowl
