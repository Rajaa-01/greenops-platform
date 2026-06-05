#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh – Déploiement complet de la GreenOps Platform sur Kubernetes
# Usage : ./scripts/deploy.sh [--env local|prod] [--skip-monitoring]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Couleurs ─────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Paramètres ───────────────────────────────
ENV="local"
SKIP_MONITORING=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --env) ENV="$2"; shift 2 ;;
    --skip-monitoring) SKIP_MONITORING=true; shift ;;
    *) error "Argument inconnu : $1" ;;
  esac
done

# ── Vérifications prérequis ──────────────────
command -v kubectl  &>/dev/null || error "kubectl non trouvé"
command -v docker   &>/dev/null || error "docker non trouvé"

info "Déploiement GreenOps Platform – Environnement : $ENV"
echo ""

# ── Build local des images (env=local) ───────
if [[ "$ENV" == "local" ]]; then
  info "Build des images Docker locales..."
  docker build -t greenops/frontend:latest      ./frontend
  docker build -t greenops/api-gateway:latest   ./api-gateway
  docker build -t greenops/auth-service:latest  ./auth-service
  docker build -t greenops/metrics-service:latest ./metrics-service

  # Chargement dans minikube si disponible
  if command -v minikube &>/dev/null; then
    info "Chargement des images dans minikube..."
    minikube image load greenops/frontend:latest
    minikube image load greenops/api-gateway:latest
    minikube image load greenops/auth-service:latest
    minikube image load greenops/metrics-service:latest
  fi
fi

# ── Déploiement ──────────────────────────────
info "1/7 – Namespaces..."
kubectl apply -f k8s/namespaces/namespaces.yaml

info "2/7 – RBAC..."
kubectl apply -f k8s/rbac/rbac.yaml

info "3/7 – ConfigMaps..."
kubectl apply -f k8s/configmaps/configmaps.yaml

warn "Secrets : vérifiez que k8s/secrets/secrets.yaml contient vos vraies valeurs encodées en base64"
info "4/7 – Secrets..."
kubectl apply -f k8s/secrets/secrets.yaml

info "5/7 – PersistentVolumeClaims..."
kubectl apply -f k8s/pvc/pvc.yaml

if [[ "$SKIP_MONITORING" == "false" ]]; then
  info "6/7 – Stack monitoring (Prometheus + Grafana)..."
  kubectl apply -f k8s/monitoring/prometheus/prometheus.yaml
  kubectl apply -f k8s/monitoring/grafana/grafana.yaml
fi

info "7/7 – Application (Deployments, Services, Ingress, HPA, NetworkPolicies)..."
kubectl apply -f k8s/deployments/deployments.yaml
kubectl apply -f k8s/services/services.yaml
kubectl apply -f k8s/ingress/ingress.yaml
kubectl apply -f k8s/hpa/hpa.yaml
kubectl apply -f k8s/network-policies/network-policies.yaml

echo ""
info "Attente du démarrage des pods..."
kubectl rollout status deployment/postgres        -n greenops --timeout=120s
kubectl rollout status deployment/redis           -n greenops --timeout=120s
kubectl rollout status deployment/auth-service    -n greenops --timeout=120s
kubectl rollout status deployment/metrics-service -n greenops --timeout=120s
kubectl rollout status deployment/api-gateway     -n greenops --timeout=120s
kubectl rollout status deployment/frontend        -n greenops --timeout=120s

echo ""
info "✅ Déploiement terminé !"
echo ""
echo "  Ajoutez ces entrées dans /etc/hosts :"
echo "    127.0.0.1  greenops.local"
echo "    127.0.0.1  grafana.greenops.local"
echo "    127.0.0.1  prometheus.greenops.local"
echo ""

if [[ "$ENV" == "local" ]]; then
  if command -v minikube &>/dev/null; then
    echo "  Exposez l'ingress avec : minikube tunnel"
  else
    echo "  kubectl port-forward svc/frontend-service 8080:80 -n greenops"
  fi
fi
