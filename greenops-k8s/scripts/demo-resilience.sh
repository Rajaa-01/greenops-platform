#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# demo-resilience.sh – Démonstration de résilience & scaling pour la soutenance
# Usage : ./scripts/demo-resilience.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step()  { echo -e "\n${BLUE}━━━ $* ━━━${NC}"; }
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[~]${NC} $*"; }
pause() { echo -e "\n${YELLOW}[APPUYEZ SUR ENTRÉE POUR CONTINUER]${NC}"; read -r; }

step "DÉMONSTRATION DE RÉSILIENCE – GreenOps Platform"
echo "Ce script illustre les mécanismes de haute disponibilité Kubernetes."

# ── 1. État initial ──────────────────────────
step "1. État initial du cluster"
kubectl get pods -n greenops -o wide
kubectl get hpa -n greenops
pause

# ── 2. Suppression d'un pod (auto-restart) ───
step "2. Suppression forcée d'un pod – Kubernetes le recrée automatiquement"
POD=$(kubectl get pods -n greenops -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')
warn "Suppression du pod : $POD"
kubectl delete pod "$POD" -n greenops

info "Observation du redémarrage automatique (watch)..."
kubectl get pods -n greenops -l app=api-gateway -w &
WATCH_PID=$!
sleep 15
kill $WATCH_PID 2>/dev/null || true
pause

# ── 3. Scaling manuel ────────────────────────
step "3. Scaling manuel – augmentation à 4 replicas"
kubectl scale deployment/metrics-service --replicas=4 -n greenops
info "Replicas en cours de démarrage :"
kubectl rollout status deployment/metrics-service -n greenops --timeout=60s
kubectl get pods -n greenops -l app=metrics-service
pause

step "4. Remise à l'état initial – 2 replicas"
kubectl scale deployment/metrics-service --replicas=2 -n greenops
kubectl rollout status deployment/metrics-service -n greenops --timeout=60s

# ── 4. Simulation de charge (HPA) ────────────
step "4. Simulation de montée en charge – HPA auto-scaling"
warn "Génération de trafic artificiel sur l'API Gateway..."
kubectl run load-generator \
  --image=busybox \
  --restart=Never \
  --rm \
  -it \
  -n greenops \
  -- /bin/sh -c "while true; do wget -qO- http://api-gateway-service:4000/health; done" &

LOAD_PID=$!
info "Observation du HPA (attendre ~1 min pour déclencher le scaling)..."
kubectl get hpa api-gateway-hpa -n greenops -w &
HPA_PID=$!
sleep 90
kill $HPA_PID 2>/dev/null || true
kill $LOAD_PID 2>/dev/null || true
kubectl delete pod load-generator -n greenops --ignore-not-found=true
pause

# ── 5. Rolling update ────────────────────────
step "5. Rolling Update sans interruption de service"
warn "Mise à jour de l'image de l'API Gateway (simulation)..."
kubectl set image deployment/api-gateway api-gateway=greenops/api-gateway:latest -n greenops
kubectl rollout status deployment/api-gateway -n greenops --timeout=120s
info "Rolling update terminé – aucune interruption de service"
pause

# ── 6. Rollback ──────────────────────────────
step "6. Rollback – retour à la version précédente"
kubectl rollout undo deployment/api-gateway -n greenops
kubectl rollout status deployment/api-gateway -n greenops --timeout=60s
info "Rollback effectué avec succès"
pause

# ── 7. État final ────────────────────────────
step "7. État final du cluster"
kubectl get pods -n greenops
kubectl get pods -n greenops-monitoring
kubectl get hpa -n greenops
kubectl top pods -n greenops 2>/dev/null || warn "metrics-server non disponible (normal en local)"

echo ""
info "✅ Démonstration de résilience terminée !"
