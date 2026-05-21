package com.redhat.agentic.mesh.service;

import com.redhat.agentic.mesh.model.FaultConfig;
import com.redhat.agentic.mesh.model.TrafficBlockConfig;
import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceBuilder;
import io.fabric8.kubernetes.api.model.Service;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@ApplicationScoped
public class MeshConfigService {

    private static final Logger LOG = Logger.getLogger(MeshConfigService.class);
    private static final String MANAGED_BY_LABEL = "managed-by";
    private static final String MANAGED_BY_VALUE = "mesh-config-service";

    @Inject
    KubernetesClient client;

    @ConfigProperty(name = "mesh.namespace", defaultValue = "agentic")
    String namespace;

    private final ConcurrentHashMap<String, FaultConfig> faultConfigs = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, TrafficBlockConfig> blockConfigs = new ConcurrentHashMap<>();

    private static final CustomResourceDefinitionContext VIRTUAL_SERVICE_CTX = new CustomResourceDefinitionContext.Builder()
            .withGroup("networking.istio.io")
            .withVersion("v1")
            .withPlural("virtualservices")
            .withScope("Namespaced")
            .build();

    private static final CustomResourceDefinitionContext AUTH_POLICY_CTX = new CustomResourceDefinitionContext.Builder()
            .withGroup("security.istio.io")
            .withVersion("v1")
            .withPlural("authorizationpolicies")
            .withScope("Namespaced")
            .build();

    public List<FaultConfig> listFaultConfigs() {
        return new ArrayList<>(faultConfigs.values());
    }

    public FaultConfig applyFaultInjection(FaultConfig config) {
        String resourceName = "fault-" + config.getServiceName();
        LOG.infof("Applying fault injection for service=%s type=%s percentage=%d",
                config.getServiceName(), config.getFaultType(), config.getPercentage());

        try {
            Map<String, Object> spec = buildVirtualServiceSpec(config);

            GenericKubernetesResource vs = new GenericKubernetesResourceBuilder()
                    .withApiVersion("networking.istio.io/v1")
                    .withKind("VirtualService")
                    .withNewMetadata()
                        .withName(resourceName)
                        .withNamespace(namespace)
                        .addToLabels(MANAGED_BY_LABEL, MANAGED_BY_VALUE)
                    .endMetadata()
                    .build();
            vs.setAdditionalProperty("spec", spec);

            client.genericKubernetesResources(VIRTUAL_SERVICE_CTX)
                    .inNamespace(namespace)
                    .resource(vs)
                    .createOrReplace();

            config.setEnabled(true);
            faultConfigs.put(config.getServiceName(), config);
            LOG.infof("Successfully applied VirtualService %s in namespace %s", resourceName, namespace);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to apply VirtualService %s", resourceName);
            config.setEnabled(true);
            faultConfigs.put(config.getServiceName(), config);
        }

        return config;
    }

    public void removeFaultInjection(String serviceName) {
        String resourceName = "fault-" + serviceName;
        LOG.infof("Removing fault injection for service=%s", serviceName);

        try {
            client.genericKubernetesResources(VIRTUAL_SERVICE_CTX)
                    .inNamespace(namespace)
                    .withName(resourceName)
                    .delete();
            LOG.infof("Successfully deleted VirtualService %s", resourceName);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to delete VirtualService %s", resourceName);
        }

        faultConfigs.remove(serviceName);
    }

    public List<TrafficBlockConfig> listTrafficBlocks() {
        return new ArrayList<>(blockConfigs.values());
    }

    public TrafficBlockConfig applyTrafficBlock(TrafficBlockConfig config) {
        String resourceName = "block-" + config.getFromService() + "-to-" + config.getToService();
        LOG.infof("Applying traffic block from=%s to=%s", config.getFromService(), config.getToService());

        try {
            Map<String, Object> spec = buildAuthorizationPolicySpec(config);

            GenericKubernetesResource ap = new GenericKubernetesResourceBuilder()
                    .withApiVersion("security.istio.io/v1")
                    .withKind("AuthorizationPolicy")
                    .withNewMetadata()
                        .withName(resourceName)
                        .withNamespace(namespace)
                        .addToLabels(MANAGED_BY_LABEL, MANAGED_BY_VALUE)
                    .endMetadata()
                    .build();
            ap.setAdditionalProperties(Map.of("spec", spec));

            client.genericKubernetesResources(AUTH_POLICY_CTX)
                    .inNamespace(namespace)
                    .resource(ap)
                    .createOrReplace();

            config.setBlocked(true);
            String key = config.getFromService() + "->" + config.getToService();
            blockConfigs.put(key, config);
            LOG.infof("Successfully applied AuthorizationPolicy %s in namespace %s", resourceName, namespace);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to apply AuthorizationPolicy %s", resourceName);
            config.setBlocked(true);
            String key = config.getFromService() + "->" + config.getToService();
            blockConfigs.put(key, config);
        }

        return config;
    }

    public void removeTrafficBlock(String fromService, String toService) {
        String resourceName = "block-" + fromService + "-to-" + toService;
        LOG.infof("Removing traffic block from=%s to=%s", fromService, toService);

        try {
            client.genericKubernetesResources(AUTH_POLICY_CTX)
                    .inNamespace(namespace)
                    .withName(resourceName)
                    .delete();
            LOG.infof("Successfully deleted AuthorizationPolicy %s", resourceName);
        } catch (Exception e) {
            LOG.errorf(e, "Failed to delete AuthorizationPolicy %s", resourceName);
        }

        blockConfigs.remove(fromService + "->" + toService);
    }

    public List<String> listServices() {
        try {
            return client.services()
                    .inNamespace(namespace)
                    .list()
                    .getItems()
                    .stream()
                    .map(Service::getMetadata)
                    .map(m -> m.getName())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.errorf(e, "Failed to list services in namespace %s", namespace);
            return Collections.emptyList();
        }
    }

    private Map<String, Object> buildVirtualServiceSpec(FaultConfig config) {
        Map<String, Object> faultInner = new HashMap<>();

        if ("delay".equalsIgnoreCase(config.getFaultType())) {
            faultInner.put("delay", Map.of(
                    "percentage", Map.of("value", (double) config.getPercentage()),
                    "fixedDelay", config.getDelayMs() + "ms"
            ));
        } else if ("abort".equalsIgnoreCase(config.getFaultType())) {
            faultInner.put("abort", Map.of(
                    "percentage", Map.of("value", (double) config.getPercentage()),
                    "httpStatus", config.getAbortCode()
            ));
        }

        Map<String, Object> httpRoute = new HashMap<>();
        httpRoute.put("fault", faultInner);
        httpRoute.put("route", List.of(
                Map.of("destination", Map.of("host", config.getServiceName()))
        ));

        Map<String, Object> spec = new HashMap<>();
        spec.put("hosts", List.of(config.getServiceName()));
        spec.put("http", List.of(httpRoute));
        return spec;
    }

    private Map<String, Object> buildAuthorizationPolicySpec(TrafficBlockConfig config) {
        return Map.of(
                "selector", Map.of(
                        "matchLabels", Map.of("app", config.getToService())
                ),
                "action", "DENY",
                "rules", List.of(
                        Map.of(
                                "from", List.of(
                                        Map.of("source", Map.of(
                                                "namespaces", List.of(namespace)
                                        ))
                                ),
                                "when", List.of(
                                        Map.of(
                                                "key", "request.headers[x-source-service]",
                                                "values", List.of(config.getFromService())
                                        )
                                )
                        )
                )
        );
    }
}
