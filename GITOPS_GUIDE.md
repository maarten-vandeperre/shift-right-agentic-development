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
└── configure-argocd-apps.sh     # Create ArgoCD Application + label namespace
```

## Operators Managed

| Operator | Package Name | Channel | Approval | Namespace |
|---|---|---|---|---|
| Red Hat OpenShift Service Mesh 3 | `servicemeshoperator3` | `stable` | Manual | `openshift-operators` |
| Red Hat OpenShift Dev Spaces | `devspaces` | `stable` | Automatic | `openshift-operators` |
| Red Hat Streams for Apache Kafka (AMQ Streams) | `amq-streams` | `stable` | Manual | `openshift-operators` |

All operators are installed from the `redhat-operators` catalog in the `openshift-operators`
namespace, using the existing `global-operators` OperatorGroup.

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

### Automated (Recommended)

Run the configuration script:

```bash
./scripts/configure-argocd-apps.sh
```

The script performs two actions:

1. **Labels** the `openshift-operators` namespace with `argocd.argoproj.io/managed-by=agentic`
   so the project-scoped ArgoCD instance can manage resources there.

2. **Creates** a single ArgoCD Application called `cluster-operators` that points to
   `gitops/operators`. Through Kustomize, this manages:
   - Service Mesh 3 operator subscription
   - Dev Spaces operator subscription
   - AMQ Streams operator subscription

The Application uses:
- **Automated sync** with pruning and self-healing
- **Server-side apply** for CRD-heavy operator resources
- **Destination namespace**: `openshift-operators`

#### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ARGOCD_NAMESPACE` | `agentic` | Namespace where ArgoCD is deployed |
| `GIT_REPO_URL` | `https://github.com/maarten-vandeperre/shift-right-agentic-development.git` | Git repository URL |
| `GIT_REVISION` | `main` | Git branch/tag/commit to track |

### Manual Application Creation

```bash
# Label openshift-operators so the namespaced ArgoCD can manage it
oc label namespace openshift-operators argocd.argoproj.io/managed-by=agentic --overwrite

# Create the Application
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
    namespace: openshift-operators
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
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

## Architecture Notes

### Namespaced ArgoCD Managing openshift-operators

The ArgoCD instance in `agentic` is project-scoped (namespaced mode). By default it can
only manage resources in its own namespace. To manage operator Subscriptions in
`openshift-operators`, the namespace must be labeled:

```bash
oc label namespace openshift-operators argocd.argoproj.io/managed-by=agentic
```

The OpenShift GitOps operator automatically creates the necessary RBAC when this label
is applied, allowing the ArgoCD application controller to manage resources in that namespace.

### Matching Existing Installations

The gitops manifests are configured to match the operator Subscriptions already installed
on the cluster. Key fields that must match include:
- `installPlanApproval` (Manual vs Automatic)
- `startingCSV` (for Manual approval operators)
- `channel`
- `config` (resource requests, annotations)

If the manifests don't match, ArgoCD will show `OutOfSync` and attempt to reconcile,
potentially disrupting running operators.

---

## Troubleshooting

### ArgoCD Application Stuck in "Unknown" Sync Status

1. **"app path does not exist"**: The gitops folder has not been pushed to the remote branch.
   Commit and push, then force a refresh:
   ```bash
   git add gitops/ && git commit -m "update gitops" && git push origin main
   oc annotate application cluster-operators -n agentic argocd.argoproj.io/refresh=hard --overwrite
   ```

2. **"namespace is not managed"**: The `openshift-operators` namespace is not labeled.
   ```bash
   oc label namespace openshift-operators argocd.argoproj.io/managed-by=agentic
   ```

3. **"can not be managed when in namespaced mode"**: The manifests contain cluster-scoped
   resources (e.g. `Namespace`). Namespaced ArgoCD cannot manage those.

### Application Shows OutOfSync

The gitops manifests don't match the live cluster state. Compare:
```bash
oc get sub <operator-name> -n openshift-operators -o yaml
```
with the corresponding `subscription.yaml` in `gitops/operators/`. Ensure `installPlanApproval`,
`startingCSV`, `channel`, and `config` all match.

### Validating Manifests Locally

```bash
oc kustomize gitops/operators/
```
