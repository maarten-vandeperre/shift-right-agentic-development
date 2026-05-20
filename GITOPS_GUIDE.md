# GitOps Guide

This guide explains how to manage OpenShift operator installations and ArgoCD configuration
for the **shift-right-agentic-development** project using a GitOps approach.

## Repository Structure

```
gitops/
├── argocd/
│   ├── argocd.yaml              # ArgoCD instance definition
│   └── kustomization.yaml
├── operators/
│   ├── kustomization.yaml       # Root kustomization for all operators
│   ├── service-mesh-3/
│   │   ├── namespace.yaml       # openshift-service-mesh namespace
│   │   ├── subscription.yaml    # Service Mesh 3 operator subscription
│   │   └── kustomization.yaml
│   ├── devspaces/
│   │   ├── namespace.yaml       # openshift-devspaces namespace
│   │   ├── subscription.yaml    # Dev Spaces operator subscription
│   │   └── kustomization.yaml
│   └── amq-streams/
│       ├── subscription.yaml    # AMQ Streams operator subscription
│       └── kustomization.yaml
scripts/
├── get-argocd-credentials.sh    # Retrieve ArgoCD URL and admin password
└── configure-argocd-apps.sh     # Create ArgoCD Applications for all operators
```

## Operators Managed

| Operator | Package Name | Channel | Namespace |
|---|---|---|---|
| Red Hat OpenShift Service Mesh 3 | `servicemeshoperator3` | `stable` | `openshift-operators` |
| Red Hat OpenShift Dev Spaces | `devspaces` | `stable` | `openshift-operators` |
| Red Hat Streams for Apache Kafka (AMQ Streams) | `amq-streams` | `stable` | `openshift-operators` |

All operators are installed from the `redhat-operators` catalog with **Automatic** install plan approval.

---

## Prerequisites

- OpenShift cluster with cluster-admin access (for operator installations)
- OpenShift GitOps operator installed on the cluster
- `oc` CLI authenticated to the cluster
- The `agentic` project/namespace exists

---

## Step 1: Deploy the ArgoCD Instance

The OpenShift GitOps operator is already installed. Deploy a project-scoped ArgoCD instance
in the `agentic` namespace:

```bash
oc apply -k gitops/argocd/ -n agentic
```

Wait for ArgoCD to become available:

```bash
oc wait --for=jsonpath='{.status.phase}'=Available argocd/argocd -n agentic --timeout=120s
```

Verify all pods are running:

```bash
oc get pods -n agentic
```

You should see pods for `argocd-server`, `argocd-repo-server`, `argocd-application-controller`,
`argocd-redis`, and `argocd-applicationset-controller`.

---

## Step 2: Get ArgoCD Credentials

Use the provided script to retrieve the ArgoCD URL and admin password:

```bash
./scripts/get-argocd-credentials.sh
```

This outputs:
- **URL**: The ArgoCD web console route
- **Username**: `admin`
- **Password**: Retrieved from the `argocd-cluster` secret

### Manual Retrieval

If you prefer to retrieve credentials manually:

```bash
# Get the ArgoCD server URL
oc get route argocd-server -n agentic -o jsonpath='{.spec.host}'

# Get the admin password
oc get secret argocd-cluster -n agentic -o jsonpath='{.data.admin\.password}' | base64 -d
```

---

## Step 3: Configure ArgoCD Applications

### Automated (Recommended)

Run the configuration script to create ArgoCD Applications for all three operators:

```bash
./scripts/configure-argocd-apps.sh
```

The script creates three ArgoCD Applications:
- `operator-service-mesh-3` - manages Service Mesh 3 operator installation
- `operator-devspaces` - manages Dev Spaces operator installation
- `operator-amq-streams` - manages AMQ Streams operator installation

Each Application is configured with:
- **Automated sync** with pruning and self-healing
- **Server-side apply** for CRD-heavy operator resources
- **CreateNamespace** to auto-create target namespaces

#### Environment Variables

The script supports these overrides:

| Variable | Default | Description |
|---|---|---|
| `ARGOCD_NAMESPACE` | `agentic` | Namespace where ArgoCD is deployed |
| `GIT_REPO_URL` | `https://github.com/maarten-vandeperre/shift-right-agentic-development.git` | Git repository URL |
| `GIT_REVISION` | `main` | Git branch/tag/commit to track |

Example with overrides:

```bash
GIT_REVISION=develop ./scripts/configure-argocd-apps.sh
```

### Manual Application Creation

To create a single operator application manually:

```bash
oc apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: operator-service-mesh-3
  namespace: agentic
spec:
  project: default
  source:
    repoURL: https://github.com/maarten-vandeperre/shift-right-agentic-development.git
    targetRevision: main
    path: gitops/operators/service-mesh-3
  destination:
    server: https://kubernetes.default.svc
    namespace: openshift-operators
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
EOF
```

---

## Step 4: Verify the Setup

### Check ArgoCD Applications

```bash
oc get applications -n agentic
```

All applications should show `Synced` and `Healthy` status.

### Check Operator Subscriptions

```bash
oc get subscriptions -n openshift-operators
```

### Check Operator CSVs

```bash
oc get csv -n openshift-operators
```

All operators should show `Succeeded` install phase.

---

## Cluster-Admin Permissions for ArgoCD

The project-scoped ArgoCD instance in `agentic` needs cluster-level permissions to manage
operator Subscriptions in `openshift-operators` and create Namespaces. A cluster-admin must
grant these permissions:

```bash
# Grant the ArgoCD application controller cluster-admin access
oc adm policy add-cluster-role-to-user cluster-admin \
  system:serviceaccount:agentic:argocd-argocd-application-controller
```

Without this, ArgoCD will show `SyncFailed` errors when trying to create resources
outside the `agentic` namespace.

---

## Troubleshooting

### ArgoCD Application Stuck in "Unknown" or "OutOfSync"

1. Check the ArgoCD Application events:
   ```bash
   oc describe application <app-name> -n agentic
   ```

2. Verify the git repository is accessible from the cluster.

3. Make sure the manifests in the git repository are valid:
   ```bash
   oc kustomize gitops/operators/service-mesh-3/
   ```

### Operator Not Installing

1. Check the Subscription status:
   ```bash
   oc describe subscription <operator-name> -n openshift-operators
   ```

2. Verify the install plan:
   ```bash
   oc get installplan -n openshift-operators
   ```

3. Check operator pod logs:
   ```bash
   oc logs -l name=<operator-name> -n openshift-operators
   ```

### ArgoCD Permissions Error

If ArgoCD cannot create resources in `openshift-operators`, the application controller
service account needs additional RBAC. See the [Cluster-Admin Permissions](#cluster-admin-permissions-for-argocd) section.
