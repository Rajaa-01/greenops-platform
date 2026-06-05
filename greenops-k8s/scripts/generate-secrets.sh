#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# generate-secrets.sh – Génère des secrets sécurisés et met à jour secrets.yaml
# Usage : ./scripts/generate-secrets.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

SECRETS_FILE="k8s/secrets/secrets.yaml"

generate_b64() {
  openssl rand -base64 32 | tr -d '\n' | base64 | tr -d '\n'
}

encode_b64() {
  echo -n "$1" | base64 | tr -d '\n'
}

info "Génération des secrets GreenOps..."

POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_USER="greenops_prod_user"
JWT_SECRET=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 16)
GRAFANA_PASSWORD=$(openssl rand -hex 12)

POSTGRES_USER_B64=$(encode_b64 "$POSTGRES_USER")
POSTGRES_PASSWORD_B64=$(encode_b64 "$POSTGRES_PASSWORD")
JWT_SECRET_B64=$(encode_b64 "$JWT_SECRET")
REDIS_PASSWORD_B64=$(encode_b64 "$REDIS_PASSWORD")
GRAFANA_USER_B64=$(encode_b64 "admin")
GRAFANA_PASSWORD_B64=$(encode_b64 "$GRAFANA_PASSWORD")

cat > "$SECRETS_FILE" << EOF
# GÉNÉRÉ AUTOMATIQUEMENT – NE PAS COMMITTER
# $(date)

apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: greenops
type: Opaque
data:
  POSTGRES_USER: ${POSTGRES_USER_B64}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD_B64}
---
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
  namespace: greenops
type: Opaque
data:
  JWT_SECRET: ${JWT_SECRET_B64}
---
apiVersion: v1
kind: Secret
metadata:
  name: redis-secret
  namespace: greenops
type: Opaque
data:
  REDIS_PASSWORD: ${REDIS_PASSWORD_B64}
---
apiVersion: v1
kind: Secret
metadata:
  name: grafana-secret
  namespace: greenops-monitoring
type: Opaque
data:
  GF_SECURITY_ADMIN_USER: ${GRAFANA_USER_B64}
  GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD_B64}
EOF

info "✅ Secrets générés dans $SECRETS_FILE"
warn "Conservez ces valeurs dans un gestionnaire de secrets (Vault, AWS SM, etc.) :"
echo ""
echo "  POSTGRES_USER     : $POSTGRES_USER"
echo "  POSTGRES_PASSWORD : $POSTGRES_PASSWORD"
echo "  JWT_SECRET        : $JWT_SECRET"
echo "  REDIS_PASSWORD    : $REDIS_PASSWORD"
echo "  GRAFANA_PASSWORD  : $GRAFANA_PASSWORD"
echo ""
warn "Ce fichier est exclu du dépôt Git (.gitignore). Ne le commitez JAMAIS."
