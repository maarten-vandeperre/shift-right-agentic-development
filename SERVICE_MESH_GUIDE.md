# Service Mesh Guide

This guide documents the Istio service mesh configuration for the agentic namespace,
including traffic management, fault injection, and observability via Kiali.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Istio Service Mesh                           │
│                        (agentic namespace)                          │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│  │ person   │   │ address  │   │ people   │   │ chat-service │    │
│  │ service  │◄─►│ service  │   │ service  │   │              │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────┬───────┘    │
│       ▲              ▲              ▲                  │            │
│       │              │              │            ServiceEntry      │
│       ▼              ▼              ▼              (egress)        │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐         │            │
│  │ cdc      │   │ frontend │   │ mesh-cfg │         ▼            │
│  │ service  │   │          │   │ service  │   ┌──────────┐       │
│  └──────────┘   └──────────┘   └──────────┘   │ OpenAI   │       │
│                                                │ APIs     │       │
│  ┌────────────────────────────────────┐        └──────────┘       │
│  │ VirtualService / AuthorizationPolicy│                           │
│  │ (managed by mesh-config-service)    │                           │
│  └────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
                    ┌──────────┐
                    │  Kiali   │
                    │ Dashboard│
                    └──────────┘
```

## Components

### Istio Control Plane (`gitops/service-mesh/istio.yaml`)

| Setting | Value |
|---------|-------|
| Name | `agentic-mesh` |
| Version | v1.26.2 |
| Namespace | `istio-system` |
| Outbound traffic policy | `REGISTRY_ONLY` (egress restricted) |
| Access logging | Enabled (stdout) |

### IstioCNI

Deployed cluster-wide for pod network management without init containers.

### Namespace Enrollment (`gitops/service-mesh/namespace-enrollment.yaml`)

The `agentic` namespace is enrolled in the mesh with the `istio-injection: enabled` label.
All pods in the namespace automatically get an Envoy sidecar proxy injected.

### Egress Configuration (`gitops/service-mesh/egress.yaml`)

Since `outboundTrafficPolicy` is set to `REGISTRY_ONLY`, all external traffic is blocked
unless explicitly allowed via ServiceEntry resources:

| ServiceEntry | Hosts | Purpose |
|---|---|---|
| `allow-openai-api` | `*.openai.com` | OpenAI API access for chat-service |
| `allow-ollama` | `*.ollama.ai` | Ollama local LLM access |
| `allow-generic-llm` | `*.azure.com`, `*.googleapis.com`, `*.anthropic.com` | Other LLM providers |

To add more egress rules, create additional ServiceEntry resources in the `agentic` namespace.

### Kiali (`gitops/service-mesh/kiali.yaml`)

Kiali is deployed for service mesh observability:

| Setting | Value |
|---------|-------|
| Namespace | `kiali` |
| Auth strategy | `anonymous` (no login required) |
| Monitored namespaces | `agentic` |
| View-only mode | Disabled |

The Kiali dashboard is accessible via the frontend's **Kiali** tab or directly at the route URL.

### Mesh Config Service (`apps/mesh-config-service/`)

A Quarkus microservice that provides a REST API for managing Istio traffic policies:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mesh/services` | GET | List all services in the namespace |
| `/api/mesh/faults` | GET | List active fault injection configs |
| `/api/mesh/faults` | POST | Apply a fault injection (delay or abort) |
| `/api/mesh/faults/{service}` | DELETE | Remove fault injection |
| `/api/mesh/blocks` | GET | List active traffic blocks |
| `/api/mesh/blocks` | POST | Block traffic between two services |
| `/api/mesh/blocks/{from}/{to}` | DELETE | Remove a traffic block |

The service uses a dedicated ServiceAccount (`mesh-config-sa`) with RBAC permissions
to create/delete VirtualService and AuthorizationPolicy resources.

## Frontend Tabs

### Kiali Tab
Embeds the Kiali dashboard in an iframe. If the iframe is blocked by CSP headers,
a link to open Kiali in a new tab is provided.

### Service Mesh Tab
Provides a UI to manage mesh policies:

**Fault Injection:**
- Select a service from a dropdown
- Choose fault type: Delay (add latency) or Abort (return error code)
- Set percentage (0-100%) of requests affected
- Apply or remove the fault

**Traffic Blocking:**
- Select source and destination services
- Block all traffic from source to destination
- View and remove active blocks

## Deployment

Service mesh components are applied via the configure script (cluster-scoped resources
can't be managed by the namespaced ArgoCD):

```bash
./scripts/configure-argocd-apps.sh
```

This applies:
1. Istio control plane and IstioCNI
2. Namespace enrollment for `agentic`
3. Egress ServiceEntry rules
4. Kiali operator subscription and instance
5. The mesh-config-service via ArgoCD

After applying, restart all pods to inject Envoy sidecars:

```bash
oc rollout restart deploy -n agentic
```

## Verifying the Mesh

```bash
# Check Istio control plane
oc get istio -A

# Check sidecar injection
oc get pods -n agentic -o jsonpath='{range .items[*]}{.metadata.name}{" containers: "}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'

# Check Kiali
oc get route kiali -n kiali

# Check egress rules
oc get serviceentry -n agentic
```

## Troubleshooting

### Pods not getting sidecar injected
Verify the namespace has the injection label:
```bash
oc get ns agentic --show-labels | grep istio
```

If missing:
```bash
oc label namespace agentic istio-injection=enabled --overwrite
oc rollout restart deploy -n agentic
```

### External API calls failing (egress blocked)
The mesh uses `REGISTRY_ONLY` outbound policy. Check if a ServiceEntry exists
for the target host:
```bash
oc get serviceentry -n agentic
```

Add a new ServiceEntry for the required host.

### Kiali not showing data
- Ensure pods have sidecar proxies (check for `istio-proxy` container)
- Kiali needs a few minutes to collect telemetry data
- Check Kiali pod logs: `oc logs -l app=kiali -n kiali`

### Fault injection not working
- Verify the VirtualService was created: `oc get vs -n agentic`
- The sidecar proxy must be injected for fault injection to work
- Check mesh-config-service logs: `oc logs deploy/mesh-config-service -n agentic`
