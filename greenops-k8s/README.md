# GreenOps Platform – Phase 2 : Migration Kubernetes

> **Module** : Docker & Kubernetes - Virtualisation des applications  
> **Institut** : IEF2I Education  
> **Auteur** : BENYAMINA Mohamed  

---

## Table des matières

1. [Architecture Kubernetes](#architecture)
2. [Prérequis](#prérequis)
3. [Installation rapide](#installation-rapide)
4. [Structure du projet](#structure-du-projet)
5. [Namespaces](#namespaces)
6. [Services déployés](#services-déployés)
7. [Objets Kubernetes utilisés](#objets-kubernetes)
8. [Haute disponibilité & Résilience](#haute-disponibilité--résilience)
9. [Observabilité](#observabilité)
10. [Sécurité](#sécurité)
11. [Accès à la plateforme](#accès)
12. [CI/CD](#cicd)
13. [Extensions avancées](#extensions-avancées)
14. [Démonstration soutenance](#démonstration-soutenance)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLUSTER KUBERNETES                          │
│                                                                 │
│  Namespace: greenops                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Ingress Controller (nginx)                              │  │
│  │       │                                                  │  │
│  │  ┌────▼─────┐    ┌─────────────┐    ┌───────────────┐  │  │
│  │  │ Frontend │    │ API Gateway │    │ Auth Service  │  │  │
│  │  │  (×2)    │───▶│   (×2 HPA) │───▶│  (×2 HPA)     │  │  │
│  │  └──────────┘    └──────┬──────┘    └───────┬───────┘  │  │
│  │                         │                    │          │  │
│  │                  ┌──────▼──────┐    ┌────────▼──────┐  │  │
│  │                  │  Metrics    │    │  PostgreSQL    │  │  │
│  │                  │  Service    │    │  (PVC 5Gi)    │  │  │
│  │                  │  (×2 HPA)  │    └───────────────┘  │  │
│  │                  └──────┬──────┘                       │  │
│  │                         │           ┌───────────────┐  │  │
│  │                         └──────────▶│   Redis        │  │  │
│  │                                     │  (PVC 1Gi)    │  │  │
│  └─────────────────────────────────────┴───────────────┘  │  │
│                                                             │  │
│  Namespace: greenops-monitoring                             │  │
│  ┌──────────────────────────────────────────────────────┐  │  │
│  │  Prometheus (PVC 10Gi) ──scrape──▶ tous les services │  │  │
│  │  Grafana    (PVC 2Gi)  ──query──▶ Prometheus         │  │  │
│  └──────────────────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prérequis

| Outil | Version minimale | Installation |
|-------|-----------------|--------------|
| kubectl | 1.28+ | https://kubernetes.io/docs/tasks/tools/ |
| minikube (local) | 1.32+ | https://minikube.sigs.k8s.io/docs/start/ |
| Docker | 24+ | https://docs.docker.com/engine/install/ |
| Helm (optionnel) | 3.14+ | https://helm.sh/docs/intro/install/ |

### Démarrer un cluster local (minikube)

```bash
# Démarrer minikube avec suffisamment de ressources
minikube start --cpus=4 --memory=8192 --driver=docker

# Activer les addons nécessaires
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable storage-provisioner
```

---

## Installation rapide

```bash
# 1. Cloner le dépôt
git clone https://github.com/<votre-org>/greenops-platform.git
cd greenops-platform

# 2. Générer les secrets sécurisés
chmod +x scripts/*.sh
./scripts/generate-secrets.sh

# 3. Déployer la plateforme complète
./scripts/deploy.sh --env local

# 4. Exposer l'ingress (dans un terminal séparé)
minikube tunnel

# 5. Ajouter les entrées DNS locales
echo "127.0.0.1 greenops.local grafana.greenops.local prometheus.greenops.local" | sudo tee -a /etc/hosts
```

---

## Structure du projet

```
greenops-k8s/
├── k8s/
│   ├── namespaces/         # Namespaces : greenops + greenops-monitoring
│   ├── configmaps/         # Configuration externalisée de tous les services
│   ├── secrets/            # Secrets encodés base64 (jamais commités)
│   ├── pvc/                # PersistentVolumeClaims (postgres, redis, prometheus, grafana)
│   ├── deployments/        # Deployments avec probes, resources, securityContext
│   ├── services/           # Services ClusterIP pour tous les composants
│   ├── ingress/            # Ingress nginx (greenops.local + sous-domaines monitoring)
│   ├── hpa/                # HorizontalPodAutoscaler (api-gateway, auth, metrics, frontend)
│   ├── rbac/               # ServiceAccounts, Roles, RoleBindings, ClusterRole Prometheus
│   ├── network-policies/   # Isolation réseau : default-deny + règles explicites
│   └── monitoring/
│       ├── prometheus/     # Deployment, Service, ConfigMap (prometheus.yml + alertes)
│       └── grafana/        # Deployment, Service, dashboards provisionnés automatiquement
├── scripts/
│   ├── deploy.sh           # Déploiement complet en une commande
│   ├── generate-secrets.sh # Génération sécurisée des secrets Kubernetes
│   └── demo-resilience.sh  # Script de démonstration pour la soutenance
└── .github/
    └── workflows/
        └── ci-cd-kubernetes.yaml  # Pipeline CI/CD complet (test → build → scan → deploy)
```

---

## Namespaces

| Namespace | Contenu |
|-----------|---------|
| `greenops` | Frontend, API Gateway, Auth, Metrics, PostgreSQL, Redis |
| `greenops-monitoring` | Prometheus, Grafana |

---

## Services déployés

| Service | Image | Replicas | Port |
|---------|-------|----------|------|
| frontend | greenops/frontend | 2 (HPA: 2-6) | 80 |
| api-gateway | greenops/api-gateway | 2 (HPA: 2-8) | 4000 |
| auth-service | greenops/auth-service | 2 (HPA: 2-6) | 5000 |
| metrics-service | greenops/metrics-service | 2 (HPA: 2-10) | 5001 |
| postgres | postgres:15-alpine | 1 | 5432 |
| redis | redis:7-alpine | 1 | 6379 |
| prometheus | prom/prometheus:v2.51.0 | 1 | 9090 |
| grafana | grafana/grafana:10.4.0 | 1 | 3000 |

---

## Objets Kubernetes

### Utilisés dans ce projet

| Objet | Usage |
|-------|-------|
| `Namespace` | Isolation logique greenops / greenops-monitoring |
| `Deployment` | Déploiement de tous les services avec RollingUpdate |
| `Service` (ClusterIP) | Exposition interne des pods |
| `Ingress` | Routage HTTP externe via nginx ingress controller |
| `ConfigMap` | Configuration externalisée (env vars, fichiers config) |
| `Secret` | Credentials sensibles (never in Git) |
| `PersistentVolumeClaim` | Persistance des données (postgres, redis, prometheus, grafana) |
| `HorizontalPodAutoscaler` | Scaling automatique sur CPU/RAM |
| `ServiceAccount` | Identités des pods (principe du moindre privilège) |
| `Role` / `ClusterRole` | Permissions RBAC |
| `RoleBinding` / `ClusterRoleBinding` | Association rôles ↔ ServiceAccounts |
| `NetworkPolicy` | Isolation réseau entre services |

### Probes configurées sur chaque service applicatif

```yaml
livenessProbe:   # Kubernetes redémarre le pod si l'app est bloquée
readinessProbe:  # Kubernetes retire le pod du load-balancer s'il n'est pas prêt
startupProbe:    # Laisse le temps au service de démarrer sans être tué prématurément
```

---

## Haute disponibilité & Résilience

### Stratégies de déploiement

Tous les services applicatifs utilisent **RollingUpdate** :
```yaml
rollingUpdate:
  maxSurge: 1        # +1 pod pendant la mise à jour
  maxUnavailable: 0  # Aucun pod indisponible pendant la mise à jour
```

### HPA – Scaling automatique

```bash
# Observer le HPA en temps réel
kubectl get hpa -n greenops -w

# Forcer un stress test (déclenche le scaling)
kubectl run stress --image=busybox --rm -it -n greenops -- \
  /bin/sh -c "while true; do wget -qO- http://api-gateway-service:4000/health; done"
```

### Démonstration de résilience

```bash
./scripts/demo-resilience.sh
```

Ce script démontre :
- Redémarrage automatique d'un pod supprimé
- Scaling manuel et automatique (HPA)
- Rolling update sans interruption
- Rollback en cas de problème

---

## Observabilité

### Accès Grafana

- URL : http://grafana.greenops.local
- Login : admin / (voir generate-secrets.sh)
- Dashboard provisonné : **GreenOps Platform Overview**

### Métriques exposées par les services

```
# Exemples de métriques PromQL
up                                                    # Services actifs
rate(energy_requests_total[1m])                       # Taux de requêtes énergétiques
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))  # Latence P95
process_resident_memory_bytes / 1024 / 1024           # RAM en MB
kube_deployment_status_replicas_ready{namespace="greenops"}  # Replicas prêts
```

### Alertes configurées

| Alerte | Condition | Sévérité |
|--------|-----------|----------|
| ServiceDown | up == 0 pendant 1 min | critical |
| HighCPUUsage | CPU > 80% pendant 2 min | warning |
| HighMemoryUsage | RAM > 200MB pendant 5 min | warning |
| HighEnergyRequestRate | > 100 req/s pendant 3 min | warning |
| HighRequestLatency | P95 > 1s pendant 2 min | warning |

---

## Sécurité

### Principes appliqués

- **Secrets** : jamais dans Git, générés via `scripts/generate-secrets.sh`, encodés base64
- **runAsNonRoot** : tous les pods s'exécutent avec un utilisateur non-root
- **RBAC** : ServiceAccounts dédiés, permissions minimales
- **NetworkPolicies** : `default-deny-all` + règles explicites par service
- **imagePullPolicy: IfNotPresent** : évite les pulls non contrôlés en production

### Vérifications de sécurité

```bash
# Vérifier les contextes de sécurité
kubectl get pods -n greenops -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext}{"\n"}{end}'

# Vérifier les NetworkPolicies actives
kubectl get networkpolicies -n greenops

# Scan Trivy sur une image
trivy image greenops/api-gateway:latest
```

---

## Accès

| Service | URL locale |
|---------|-----------|
| Frontend | http://greenops.local |
| API | http://greenops.local/api |
| Grafana | http://grafana.greenops.local |
| Prometheus | http://prometheus.greenops.local |

### Port-forward alternatif (sans ingress)

```bash
kubectl port-forward svc/frontend-service     8080:80   -n greenops
kubectl port-forward svc/api-gateway-service  4000:4000 -n greenops
kubectl port-forward svc/grafana-service      3000:3000 -n greenops-monitoring
kubectl port-forward svc/prometheus-service   9090:9090 -n greenops-monitoring
```

---

## CI/CD

Le pipeline `.github/workflows/ci-cd-kubernetes.yaml` exécute :

| Job | Déclencheur | Actions |
|-----|------------|---------|
| test | push/PR | Install deps, lint, tests unitaires |
| build | push main | Build & push images GHCR (multi-arch) |
| security-scan | après build | Trivy CRITICAL/HIGH + kubeval manifests |
| deploy | après scan | kubectl apply + rollout status |

---

## Extensions avancées

> Fonctionnalités optionnelles valorisées à la soutenance

- **WebSockets temps réel** : ajout d'un service Socket.IO pour les métriques live
- **Message broker** : déploiement de RabbitMQ ou Kafka avec StatefulSet
- **GitOps avec ArgoCD** : synchronisation automatique des manifests depuis Git
- **Centralisation des logs** : stack EFK (Elasticsearch + Fluentd + Kibana) ou Loki
- **Tests de charge** : k6 ou Locust en Job Kubernetes

---

## Démonstration soutenance

```bash
# Checklist avant la soutenance
kubectl get all -n greenops
kubectl get all -n greenops-monitoring
kubectl get pvc -n greenops
kubectl get hpa -n greenops
kubectl get networkpolicies -n greenops

# Lancer la démo de résilience
./scripts/demo-resilience.sh
```

### Points clés à présenter

1. **Architecture** : schéma avec namespaces, services, Ingress, PVC
2. **Objets K8s** : montrer chaque type (Deployment, ConfigMap, Secret, HPA, NetworkPolicy…)
3. **Sécurité** : runAsNonRoot, RBAC, NetworkPolicies, secrets
4. **Résilience** : suppression de pod → redémarrage auto (liveness probe)
5. **Scaling** : HPA en action avec simulation de charge
6. **Observabilité** : Grafana dashboards + alertes Prometheus
7. **CI/CD** : pipeline GitHub Actions avec scan de sécurité
