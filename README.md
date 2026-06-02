# GreenOps Platform - Phase Docker

## Installation
1. Clone the repository
2. Copy `.env.example` to `.env` and adjust secrets
3. Run `docker-compose up --build`
4. Access http://localhost

## Architecture
See diagram above. Networks:
- `frontend-network` : Nginx ↔ Frontend, Grafana (web access)
- `backend-network`  : internal services, no external exposure
- `monitoring-network`: Prometheus scraping and Grafana

## Useful commands
```bash
docker-compose logs -f
docker-compose down -v
docker exec -it postgres psql -U greenops -d greenops