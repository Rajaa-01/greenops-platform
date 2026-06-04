# GreenOps Platform

> Plateforme de supervision et d'analyse de métriques énergétiques — architecture microservices conteneurisée et orchestrée sous Kubernetes.

---

## Table des matières

- [Architecture](#architecture)
- [Phase 1 — Infrastructure Docker](#phase-1--infrastructure-docker)
- [Phase 2 — Orchestration Kubernetes](#phase-2--orchestration-kubernetes)
- [Monitoring](#monitoring)
- [Sécurité](#sécurité)
- [CI/CD](#cicd)
- [Commandes utiles](#commandes-utiles)

---

## Architecture

La plateforme repose sur une architecture microservices composée des services suivants :

| Service | Rôle | Port |
|---|---|---|
| **frontend** | Interface React (Nginx) | 80 |
| **api-gateway** | Point d'entrée unique, reverse proxy vers les services | 4000 |
| **auth-service** | Authentification JWT, gestion des utilisateurs (PostgreSQL + Redis) | 5000 |
| **metrics-service** | Collecte et exposition des métriques énergétiques (Redis) | 5001 |
| **postgres** | Base de données relationnelle | 5432 |
| **redis** | Cache et blacklist JWT | 6379 |
| **prometheus** | Scraping des métriques applicatives | 9090 |
| **grafana** | Dashboards de supervision | 3000 |

### Réseaux Docker

```
frontend-network   → Nginx ↔ Frontend, API Gateway, Grafana (accès web)
backend-network    → Services internes uniquement (auth, metrics, postgres, redis)
monitoring-network → Prometheus scraping + Grafana
```

---

## Phase 1 — Infrastructure Docker

### Prérequis

- Docker Desktop installé et démarré
- Fichier `.env` configuré (voir `.env.example`)

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/Rajaa-01/greenops-platform.git
cd greenops-platform

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs (JWT_SECRET, POSTGRES_PASSWORD, etc.)

# 3. Lancer la stack complète
docker-compose up --build

# 4. Accéder à la plateforme
# Frontend      → http://localhost
# Grafana       → http://localhost:3000  (admin/admin)
# Prometheus    → http://localhost:9090
# API Gateway   → http://localhost:4000
```

### Commandes Docker utiles

```bash
# Logs en temps réel
docker-compose logs -f

# Arrêter et supprimer les volumes
docker-compose down -v

# Connexion PostgreSQL
docker exec -it postgres psql -U greenops -d greenops

# Connexion Redis
docker exec -it redis redis-cli -a <REDIS_PASSWORD>
```

---

## Phase 2 — Orchestration Kubernetes

### Prérequis

- Minikube installé
- kubectl installé
- Docker Desktop (pour le build des images)

### Déploiement complet

```powershell
# 1. Démarrer Minikube
minikube start

# 2. Activer l'Ingress controller
minikube addons enable ingress

# 3. Pointer Docker vers le daemon Minikube
minikube docker-env --shell powershell | Invoke-Expression

# 4. Builder les images dans Minikube
docker build -t greenops/auth-service:latest ./auth-service
docker build -t greenops/metrics-service:latest ./metrics-service
docker build -t greenops/api-gateway:latest ./api-gateway
docker build -t greenops/frontend:latest ./frontend

# 5. Déployer les manifests Kubernetes
kubectl apply -f greenops-k8s/k8s/namespaces/
kubectl apply -f greenops-k8s/k8s/secrets/
kubectl apply -f greenops-k8s/k8s/configmaps/
kubectl apply -f greenops-k8s/k8s/pvc/
kubectl apply -f greenops-k8s/k8s/deployments/
kubectl apply -f greenops-k8s/k8s/services/
kubectl apply -f greenops-k8s/k8s/ingress/
kubectl apply -f greenops-k8s/k8s/hpa/
kubectl apply -f greenops-k8s/k8s/network-policies/

# 6. Exposer via tunnel
minikube tunnel

# 7. Accéder à la plateforme
# http://localhost
```

### Structure des manifests

```
greenops-k8s/k8s/
├── namespaces/        → Namespace greenops
├── secrets/           → Secrets (JWT, PostgreSQL, Redis)
├── configmaps/        → ConfigMaps par service
├── pvc/               → PersistentVolumeClaims (postgres, redis)
├── deployments/       → Deployments (tous les services)
├── services/          → Services ClusterIP
├── ingress/           → Ingress Controller (Nginx)
├── hpa/               → HorizontalPodAutoscaler
├── rbac/              → RBAC (ServiceAccounts, Roles)
├── network-policies/  → Isolation réseau inter-services
└── monitoring/        → Prometheus + Grafana
```

### Vérifier l'état du cluster

```powershell
# État des pods
kubectl get pods -n greenops

# État des services
kubectl get svc -n greenops

# Logs d'un service
kubectl logs -n greenops deploy/auth-service --tail=50

# Décrire un pod en erreur
kubectl describe pod -n greenops <pod-name>
```

---

## Monitoring

### Prometheus

Prometheus scrape automatiquement les métriques exposées sur `/metrics` par chaque service Node.js (via `prom-client`).

```powershell
kubectl port-forward -n greenops svc/<prometheus-service-name> 9090:9090
# → http://localhost:9090/targets
```

### Grafana

```powershell
kubectl port-forward -n greenops svc/<grafana-service-name> 3000:3000
# → http://localhost:3000  (admin/admin)
```

Les dashboards disponibles permettent de visualiser :
- L'état de santé des pods (liveness/readiness)
- La consommation énergétique en temps réel
- Les durées des requêtes HTTP par service
- Le nombre de requêtes totales

---

## Résilience et Scaling

### Démonstration de résilience

```powershell
# Supprimer tous les pods d'un service — Kubernetes les recrée automatiquement
kubectl delete pod -n greenops -l app=auth-service --wait=false
kubectl get pods -n greenops -w
```

### Scaling manuel

```powershell
# Scaler à 4 replicas
kubectl scale deployment auth-service -n greenops --replicas=4

# Revenir à 2 replicas
kubectl scale deployment auth-service -n greenops --replicas=2
```

### HPA (Horizontal Pod Autoscaler)

Le HPA est configuré pour scaler automatiquement les services en fonction de la charge CPU. Vérifier son état :

```powershell
kubectl get hpa -n greenops
```

---

## Sécurité

- Les secrets (JWT, mots de passe DB/Redis) sont gérés via les **Kubernetes Secrets** et le fichier `.env` (jamais commité en Git)
- Les **Network Policies** isolent les communications inter-services
- Les **RBAC** limitent les permissions au minimum nécessaire
- Les conteneurs tournent en **non-root** (sauf postgres/nginx qui le nécessitent)
- Les images utilisent des **builds multi-stage** pour minimiser la surface d'attaque

---

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci-cd-kubernetes.yaml`) automatise :

1. **Tests & Lint** — sur chaque push/PR vers `main` et `develop`
2. **Build & Push** — images Docker vers GitHub Container Registry (`ghcr.io`) sur `main`
3. **Security Scan** — analyse des vulnérabilités avec Trivy
4. **Deploy** — déploiement automatique sur cluster distant (via `KUBECONFIG` secret)

---

## Variables d'environnement

Copier `.env.example` en `.env` et renseigner :

| Variable | Description |
|---|---|
| `JWT_SECRET` | Clé secrète pour la signature des tokens JWT |
| `POSTGRES_USER` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base de données |
| `REDIS_PASSWORD` | Mot de passe Redis |

---

## Credentials de démonstration

| Champ | Valeur |
|---|---|
| Username | `demo` |
| Password | `demo123` |
