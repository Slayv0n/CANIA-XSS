FROM postgres:15

# Копируем нашу конфигурацию pg_hba.conf
COPY pg_hba.conf /var/lib/postgresql/data/pg_hba.conf

ENV POSTGRES_USER=CaniaUserAdmin
ENV POSTGRES_PASSWORD=developmentPassword
ENV POSTGRES_DB=UserDb

EXPOSE 5432
