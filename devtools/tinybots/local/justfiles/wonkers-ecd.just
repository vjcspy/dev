# ------------------------------------- wonkers-ecd -------------------------------------
test-wonkers-ecd:
    {{compose}} rm -sf mysql-wonkers-db
    {{compose}} up -d \
     mysql-wonkers-db wonkers-db mailcatcher kryten
    {{compose}} run --rm --use-aliases wonkers-ecd
