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
│   ├── operator-group.yaml      # OperatorGroup (AllNamespaces mode)
│   ├── service-mesh-3/
│   │   ├── subscription.yaml    # Service Mesh 3 operator subscription
│   │   └── kustomization.yaml
│   ├── devspaces/
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

| Operator | Package Name | Channel | Install Namespace |
|---|---|---|---|
| Red Hat OpenShift Service Mesh 3 | `servicemeshoperator3` | `stable` | `agentic` |
| Red Hat OpenShift Dev Spaces | `devspaces` | `stable` | `agentic` |
| Red Hat Streams for Apache Kafka (AMQ Streams) | `amq-streams` | `stable` | `agentic` |

All operators are installed from the `redhat-operators` catalog with **Automatic** install plan approval.

An `OperatorGroup` in AllNamespaces mode is deployed so the operators watch all namespaces
on the cluster, even though the Subscriptions themselves live in the `agentic` namespace.

> **Why `agentic` instead of `openshift-operators`?**
> A project-scoped ArgoCD instance can only manage resources within its own namespace.
> Targeting `openshift-operators` would cause `"namespace is not managed"` errors.
> The OperatorGroup with empty `spec` (AllNamespaces mode) ensures the operators still
> function cluster-wide.

---

## Prerequisites

- OpenShift cluster with the OpenShift GitOps operator installed
- `oc` CLI authenticated to the cluster
- The `agentic` project/namespace exists
- Manifests must be committed and pushed to the remote git repository before ArgoCD can sync

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

> **Important**: The gitops manifests must be committed and pushed to the remote repository
> before running this step. ArgoCD fetches from the remote git URL, not the local filesystem.
> If the paths don't exist on the remote branch, applications will show `Unknown` sync status
> with a `"app path does not exist"` error.

### Automated (Recommended)

Run the configuration script to create ArgoCD Applications for all three operators:

```bash
./scripts/configure-argocd-apps.sh
```

The script creates a single ArgoCD Application called `cluster-operators` that points to
the root `gitops/operators` path. Through Kustomize, this deploys:
- The **OperatorGroup** in AllNamespaces mode
- **Service Mesh 3** operator subscription
- **Dev Spaces** operator subscription
- **AMQ Streams** operator subscription

The Application is configured with:
- **Automated sync** with pruning and self-healing
- **Server-side apply** for CRD-heavy operator resources
- **CreateNamespace** sync option enabled
- **Destination namespace**: `agentic` (matching the ArgoCD managed namespace)

> Using a single Application ensures the OperatorGroup is always deployed alongside
> the Subscriptions. Without the OperatorGroup, OLM cannot generate InstallPlans
> and the operators will not install.

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

To create the operators application manually:

```bash
oc apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cluster-operators
  namespace: agentic
spec:
  project: default
  source:
    repoURL: https://github.com/maarten-vandeperre/shift-right-agentic-development.git
    targetRevision: main
    path: gitops/operators
  destination:
    server: https://kubernetes.default.svc
    namespace: agentic
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
oc get subscriptions -n agentic
```

### Check Operator CSVs

```bash
oc get csv -n agentic
```

All operators should show `Succeeded` install phase.

### Check the OperatorGroup

```bash
oc get operatorgroup -n agentic
```

You should see `agentic-operator-group` with no target namespaces (AllNamespaces mode).

---

## Architecture: Namespaced ArgoCD

The ArgoCD instance deployed here is **project-scoped** (namespaced mode). This has
implications for what it can manage:

| Resource Type | Can Manage? | Notes |
|---|---|---|
| Namespaced resources in `agentic` | Yes | Subscriptions, OperatorGroups, etc. |
| Namespaced resources in other namespaces | No | Would require `argocd.argoproj.io/managed-by` label on target namespace |
| Cluster-scoped resources (Namespace, CRDs) | No | Requires cluster-scoped ArgoCD in `openshift-gitops` |

This is why all operator Subscriptions target the `agentic` namespace with an OperatorGroup
in AllNamespaces mode, rather than the traditional `openshift-operators` namespace.

---

## Troubleshooting

### ArgoCD Application Stuck in "Unknown" Sync Status

This typically means ArgoCD cannot load the manifests from the git repository.

1. **"app path does not exist"**: The gitops folder has not been pushed to the remote branch.
   Commit and push your changes, then force a refresh:
   ```bash
   git add gitops/ && git commit -m "update gitops" && git push origin main
   oc annotate application <app-name> -n agentic argocd.argoproj.io/refresh=normal --overwrite
   ```

2. **"namespace is not managed"**: The Application's destination namespace is outside ArgoCD's
   managed scope. Change the destination to `agentic`.

3. **"can not be managed when in namespaced mode"**: The manifests contain cluster-scoped
   resources (e.g. `Namespace`). Remove them; operators create their own namespaces.

4. **General diagnosis**:
   ```bash
   oc describe application <app-name> -n agentic
   oc logs -l app.kubernetes.io/name=argocd-repo-server -n agentic --tail=50
   ```

### Operator Not Installing

1. Check the Subscription status:
   ```bash
   oc describe subscription <operator-name> -n agentic
   ```

2. Verify the install plan:
   ```bash
   oc get installplan -n agentic
   ```

3. Confirm the OperatorGroup exists:
   ```bash
   oc get operatorgroup -n agentic
   ```
   If missing, ArgoCD should create it from `gitops/operators/operator-group.yaml`.

### Validating Manifests Locally

Before pushing, validate kustomize output:

```bash
oc kustomize gitops/operators/service-mesh-3/
oc kustomize gitops/operators/devspaces/
oc kustomize gitops/operators/amq-streams/
oc kustomize gitops/operators/
```
