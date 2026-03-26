# Database Docker Configuration

This folder contains the PostgreSQL image configuration and seed scripts for `mantenimiento_db`.

## Build Image

From this directory, build the image with the requested tag:

```bash
docker build -t ivanmoliinero/postgres-mantenimiento-db:v1 .
```

## Run Container

Start a container from the built image (just like indicated in feature/backend-api):

```bash
docker run --name awesome_banzai \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=adminpassword \
  -e POSTGRES_DB=mantenimiento_db \
  -p 5432:5432 \
  ivanmoliinero/postgres-mantenimiento-db:v1
```

## Verify Database Is Ready

Check logs to confirm initialization and seed execution:

```bash
docker logs -f awesome_banzai
```

## Stop And Remove Container

```bash
docker stop awesome_banzai
docker rm awesome_banzai
```

## Optional: Use Docker Compose

A `docker-compose.yml` file is present, but the image build command above is the direct and recommended way to produce and run:

`ivanmoliinero/postgres-mantenimiento-db:v1`
