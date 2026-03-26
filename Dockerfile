FROM postgres:16

# Instalar Python 3 y el conector nativo de PostgreSQL para Debian
RUN apt-get update && apt-get install -y python3 python3-psycopg2

ENV POSTGRES_USER=admin
ENV POSTGRES_PASSWORD=adminpassword
ENV POSTGRES_DB=mantenimiento_db

# Copiar los scripts SQL masivos
COPY *.sql /docker-entrypoint-initdb.d/

# Copiar el script de Python y su disparador bash
COPY seed_data.py /app/seed_data.py
COPY 03_run_python.sh /docker-entrypoint-initdb.d/