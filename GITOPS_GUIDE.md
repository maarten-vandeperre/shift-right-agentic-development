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
│   │   ├── subscription.yaml
│   │   └── kustomization.yaml
│   ├── devspaces/
│   │   ├── subscription.yaml
│   │   └── kustomization.yaml
│   └── amq-streams/
│       ├── subscription.yaml
│       └── kustomization.yaml
├── databases/
│   ├── kustomization.yaml       # Root kustomization for all databases
│   ├── postgresql/
│   │   ├── secret.yaml          # PostgreSQL credentials
│   │   ├── pvc.yaml             # Persistent storage
│   │   ├── init-job.yaml        # PostSync Job: schema + seed data
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── mongodb/
│       ├── secret.yaml          # MongoDB credentials
│       ├── pvc.yaml             # Persistent storage
│       ├── init-job.yaml        # PostSync Job: seed data
│       ├── deployment.yaml
│       ├── service.yaml
│       └── kustomization.yaml
scripts/
├── get-argocd-credentials.sh    # Retrieve ArgoCD URL and admin password
└── configure-argocd-apps.sh     # Create ArgoCD Applications + label namespaces
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

The script performs three actions:

1. **Labels** the `openshift-operators` namespace with `argocd.argoproj.io/managed-by=agentic`
   so the project-scoped ArgoCD instance can manage resources there.

2. **Creates** the `cluster-operators` ArgoCD Application (`gitops/operators`), managing:
   - Service Mesh 3 operator subscription
   - Dev Spaces operator subscription
   - AMQ Streams operator subscription

3. **Creates** the `databases` ArgoCD Application (`gitops/databases`), managing:
   - PostgreSQL deployment with schema and seed data
   - MongoDB deployment with aggregated seed documents

Both Applications use:
- **Automated sync** with pruning and self-healing
- **Server-side apply** for reliable resource management

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

## Databases

### PostgreSQL

Deployed in the `agentic` namespace using the OpenShift imagestream `postgresql:15-el9`.

**Schema:**

```
address
├── ref         UUID PRIMARY KEY
├── line_1      VARCHAR(255) NOT NULL
├── line_2      VARCHAR(255)
└── country     VARCHAR(100) NOT NULL

person
├── ref          UUID PRIMARY KEY
├── first_name   VARCHAR(100) NOT NULL
├── last_name    VARCHAR(100) NOT NULL
├── email        VARCHAR(255) NOT NULL UNIQUE
└── address_ref  UUID → address(ref)
```

**Connection details (in-cluster):**

| Field    | Value |
|----------|-------|
| Host     | `postgresql.agentic.svc.cluster.local` |
| Port     | `5432` |
| Database | `agentic` |
| User     | `agentic` |
| Password | from secret `postgresql-credentials` |

**Seed data:** 4 people, 3 addresses. Two people share the same address (Belgium).

### MongoDB

Deployed in the `agentic` namespace using the Red Hat `rhscl/mongodb-36-rhel7` image
(OpenShift-compatible, runs as non-root).

**Collection:** `people` in database `agentic`

Each document is the aggregated view of a person with their address embedded:

```json
{
  "ref": "a1b2c3d4-...",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "address": {
    "ref": "d4e5f6a7-...",
    "line1": "123 Main Street",
    "line2": "Apt 4B",
    "country": "Belgium"
  }
}
```

**Connection details (in-cluster):**

| Field    | Value |
|----------|-------|
| Host     | `mongodb.agentic.svc.cluster.local` |
| Port     | `27017` |
| Database | `agentic` |
| User     | `agentic` |
| Password | from secret `mongodb-credentials` |

**Seed data:** 4 documents matching the PostgreSQL person+address join.

### Verifying Database Content

```bash
# PostgreSQL - check tables and data
oc exec deploy/postgresql -n agentic -- psql -U agentic -d agentic -c "SELECT p.first_name, p.last_name, p.email, a.line_1, a.country FROM person p JOIN address a ON p.address_ref = a.ref;"

# MongoDB - check collection
oc exec deploy/mongodb -n agentic -- mongo agentic -u agentic -p agentic-mongo-pass --eval "db.people.find().pretty()"
```

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
oc kustomize gitops/databases/
```
