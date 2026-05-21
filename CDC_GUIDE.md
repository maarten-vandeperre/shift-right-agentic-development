# Change Data Capture (CDC) Guide

This guide documents the CDC pipeline that synchronizes PostgreSQL changes to MongoDB
in real-time using Kafka and Debezium.

## Architecture

```
┌────────────┐     ┌───────────┐     ┌─────────────────┐     ┌─────────────┐     ┌─────────┐
│ PostgreSQL │────>│ Debezium  │────>│  Kafka Topics   │────>│ cdc-service │────>│ MongoDB │
│ (person,   │ WAL │ Connector │ CDC │ cdc.public.*    │ msg │ (integra-   │ API │ (people │
│  address)  │     │ (pg-output│     │                 │     │  tion svc)  │     │  coll.) │
└────────────┘     └───────────┘     └─────────────────┘     └─────────────┘     └─────────┘
                                                                    │
                                                                    │ SSE
                                                                    ▼
                                                              ┌───────────┐
                                                              │ Frontend  │
                                                              │ CDC Tab   │
                                                              └───────────┘
```

### Flow

1. A user creates/updates/deletes a **person** or **address** via the REST APIs
2. PostgreSQL writes the change to its Write-Ahead Log (WAL) with `wal_level=logical`
3. **Debezium** (running as a KafkaConnect connector) reads the WAL and publishes
   a change event to Kafka topics `cdc.public.person` or `cdc.public.address`
4. The **cdc-service** consumes these topics and:
   - Fetches the current person + address data from the REST APIs
   - Combines them into a people document
   - Calls the people-service API to create/update the MongoDB document
   - Broadcasts the event via Server-Sent Events (SSE)
5. The **frontend CDC tab** displays events in real-time via the SSE stream

## Components

### Kafka Cluster (`gitops/cdc/kafka-cluster.yaml`)

A single-node KRaft-based Kafka cluster deployed via Strimzi (AMQ Streams operator):

| Setting | Value |
|---------|-------|
| Name | `cdc-cluster` |
| Version | 3.9.0 |
| Mode | KRaft (no ZooKeeper) |
| Replicas | 1 (combined controller + broker) |
| Listener | Plain text on port 9092 (internal) |
| Storage | 5Gi persistent (gp3-csi) |

Bootstrap server: `cdc-cluster-kafka-bootstrap:9092`

### KafkaConnect (`gitops/cdc/kafka-connect.yaml`)

Builds a custom KafkaConnect image with the Debezium PostgreSQL connector:

| Setting | Value |
|---------|-------|
| Name | `cdc-connect` |
| Debezium version | 2.7.3.Final |
| Plugin | `debezium-connector-postgres` |
| Build output | ImageStream `cdc-connect:latest` |

### Debezium Connector (`gitops/cdc/debezium-connector.yaml`)

The PostgreSQL source connector configuration:

| Setting | Value |
|---------|-------|
| Name | `debezium-postgres` |
| Plugin | `pgoutput` (native PostgreSQL logical decoding) |
| Tables captured | `public.person`, `public.address` |
| Topic prefix | `cdc` |
| Slot name | `debezium_cdc` |
| Publication | `dbz_publication` (auto-created, filtered) |

This produces topics:
- `cdc.public.person` — person table changes
- `cdc.public.address` — address table changes

### CDC Integration Service (`apps/cdc-service/`)

A Quarkus microservice that bridges Kafka CDC events to MongoDB:

| Setting | Value |
|---------|-------|
| Port | 8080 |
| Kafka consumer group | `cdc-integration` |
| SSE endpoint | `/api/cdc/events` |

**Person change flow:**
1. Consumes `cdc.public.person` topic
2. Parses the Debezium envelope (`op`, `before`, `after`)
3. Fetches the address from address-service using `addressRef`
4. Builds a combined people document
5. Calls people-service PUT/POST/DELETE to sync MongoDB

**Address change flow:**
1. Consumes `cdc.public.address` topic
2. Fetches all persons that reference this address
3. Rebuilds and updates each affected people document in MongoDB

### PostgreSQL WAL Configuration (`gitops/cdc/postgresql-wal-config.yaml`)

A PostSync Job that sets PostgreSQL's WAL level to `logical`:

```sql
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 4;
ALTER SYSTEM SET max_wal_senders = 4;
```

After applying, PostgreSQL needs a pod restart for the WAL level change to take effect:

```bash
oc rollout restart deploy/postgresql -n agentic
```

## Prerequisites

- AMQ Streams (Strimzi) operator installed on the cluster
- PostgreSQL and MongoDB databases deployed (via `gitops/databases/`)
- All application microservices running (via `gitops/apps/`)

## Deployment

### Automated (Recommended)

A single script handles the entire CDC deployment end-to-end:

```bash
./scripts/deploy-cdc.sh
```

This script performs all steps automatically:

1. **Configures ArgoCD** — creates the `cdc` Application (Kafka, KafkaConnect, Debezium, topics, WAL config)
2. **Waits for Kafka** — polls up to 10 minutes for the Kafka cluster to become ready
3. **Restarts PostgreSQL** — applies the `wal_level=logical` change and verifies it
4. **Builds and pushes images** — runs `build-and-push-images.sh` (cdc-service + updated frontend)
5. **Restarts deployments** — rolls out cdc-service and frontend with the new images

At the end it prints the status of all CDC components and the application URLs.

> **Note**: The script assumes the GHCR pull secret is already configured on the cluster
> (via `./scripts/create-ghcr-pull-secret.sh`). If using public packages instead, make
> sure `shift-right-cdc-service` is set to public on GHCR after the first push.

### Manual Steps

If you prefer to run each step individually:

#### Step 1: Deploy CDC Infrastructure via ArgoCD

```bash
./scripts/configure-argocd-apps.sh
```

This creates the `cdc` ArgoCD Application which deploys:
- Kafka cluster + node pool
- KafkaConnect with Debezium
- Debezium PostgreSQL connector
- CDC Kafka topics
- PostgreSQL WAL configuration job

#### Step 2: Restart PostgreSQL for WAL Configuration

After the WAL config job runs, restart PostgreSQL:

```bash
oc rollout restart deploy/postgresql -n agentic
```

Verify the WAL level:

```bash
oc exec deploy/postgresql -n agentic -- psql -U agentic -d agentic -c "SHOW wal_level;"
```

Expected output: `logical`

#### Step 3: Build and Deploy the CDC Service

```bash
./scripts/build-and-push-images.sh
```

This builds and pushes `ghcr.io/maarten-vandeperre/shift-right-cdc-service:latest`
(along with the updated frontend containing the CDC tab).

After pushing, ensure the image is pullable:

- **Pull secret**: If already configured via `./scripts/create-ghcr-pull-secret.sh`, no action needed.
- **Public**: Go to https://github.com/users/maarten-vandeperre/packages/container/shift-right-cdc-service/settings
  → **Danger Zone** → **Change visibility** → **Public**

See the [GHCR Image Pull Secret](GITOPS_GUIDE.md#ghcr-image-pull-secret) section in the
GitOps Guide for details.

#### Step 4: Verify the Pipeline

Check all components are running:

```bash
# Kafka cluster
oc get kafka -n agentic

# KafkaConnect
oc get kafkaconnect -n agentic

# Debezium connector
oc get kafkaconnector -n agentic

# CDC service
oc get pods -n agentic -l app=cdc-service

# Topics
oc get kafkatopic -n agentic
```

### Step 5: Test the CDC Flow

1. Open the frontend and navigate to the **CDC Events** tab
2. In another tab, go to **Persons** and create or edit a person
3. Watch the CDC Events tab — the change should appear in real-time
4. Navigate to **People** — the MongoDB document should be updated automatically

## Debezium Message Format

Each CDC event on the Kafka topic follows the Debezium envelope format:

```json
{
  "before": null,
  "after": {
    "ref": "a1b2c3d4-...",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "address_ref": "d4e5f6a7-..."
  },
  "op": "c",
  "source": {
    "connector": "postgresql",
    "db": "agentic",
    "table": "person",
    ...
  }
}
```

| `op` value | Meaning |
|------------|---------|
| `c` | Create (INSERT) |
| `u` | Update (UPDATE) |
| `d` | Delete (DELETE) |
| `r` | Read (snapshot) |

## Troubleshooting

### Kafka cluster not starting

```bash
oc describe kafka cdc-cluster -n agentic
oc get pods -n agentic -l strimzi.io/cluster=cdc-cluster
```

### KafkaConnect build failing

```bash
oc describe kafkaconnect cdc-connect -n agentic
oc logs -l strimzi.io/kind=KafkaConnect -n agentic
```

### Debezium connector not capturing changes

```bash
# Check connector status
oc describe kafkaconnector debezium-postgres -n agentic

# Verify WAL level
oc exec deploy/postgresql -n agentic -- psql -U agentic -d agentic -c "SHOW wal_level;"

# Check replication slot
oc exec deploy/postgresql -n agentic -- psql -U agentic -d agentic -c "SELECT * FROM pg_replication_slots;"
```

### CDC service not processing events

```bash
oc logs deploy/cdc-service -n agentic --tail=50

# Manually consume from the topic to verify events exist
oc exec -it cdc-cluster-combined-0 -n agentic -- \
  bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic cdc.public.person \
  --from-beginning --max-messages 5
```

### No events in the frontend CDC tab

1. Check the cdc-service SSE endpoint directly:
   ```bash
   curl -sk "https://cdc-service-agentic.apps.ocp.h7xz9.sandbox1562.opentlc.com/api/cdc/events"
   ```
2. Check browser console for CORS errors
3. Verify the frontend `config.js` includes the `CDC_API` URL
