# db
start-db:
    aws ecr get-login-password \
        --region eu-central-1 \
    | docker login \
        --username AWS \
        --password-stdin https://693338167548.dkr.ecr.eu-central-1.amazonaws.com
    {{compose}} up -d \
          mysql-typ-e-db typ-e mysql-wonkers-db wonkers-db
