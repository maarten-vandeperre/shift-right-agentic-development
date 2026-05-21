package com.redhat.agentic.mesh.resource;

import com.redhat.agentic.mesh.model.FaultConfig;
import com.redhat.agentic.mesh.model.TrafficBlockConfig;
import com.redhat.agentic.mesh.service.MeshConfigService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.Map;

@Path("/api/mesh")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class MeshConfigResource {

    private static final Logger LOG = Logger.getLogger(MeshConfigResource.class);

    @Inject
    MeshConfigService meshConfigService;

    @GET
    @Path("/faults")
    public List<FaultConfig> listFaults() {
        return meshConfigService.listFaultConfigs();
    }

    @POST
    @Path("/faults")
    public Response applyFault(FaultConfig config) {
        try {
            FaultConfig result = meshConfigService.applyFaultInjection(config);
            return Response.ok(result).build();
        } catch (Exception e) {
            LOG.errorf(e, "Error applying fault injection for %s", config.getServiceName());
            return Response.serverError()
                    .entity(Map.of("error", "Failed to apply fault injection: " + e.getMessage()))
                    .build();
        }
    }

    @DELETE
    @Path("/faults/{serviceName}")
    public Response removeFault(@PathParam("serviceName") String serviceName) {
        try {
            meshConfigService.removeFaultInjection(serviceName);
            return Response.noContent().build();
        } catch (Exception e) {
            LOG.errorf(e, "Error removing fault injection for %s", serviceName);
            return Response.serverError()
                    .entity(Map.of("error", "Failed to remove fault injection: " + e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/blocks")
    public List<TrafficBlockConfig> listBlocks() {
        return meshConfigService.listTrafficBlocks();
    }

    @POST
    @Path("/blocks")
    public Response applyBlock(TrafficBlockConfig config) {
        try {
            TrafficBlockConfig result = meshConfigService.applyTrafficBlock(config);
            return Response.ok(result).build();
        } catch (Exception e) {
            LOG.errorf(e, "Error applying traffic block from %s to %s",
                    config.getFromService(), config.getToService());
            return Response.serverError()
                    .entity(Map.of("error", "Failed to apply traffic block: " + e.getMessage()))
                    .build();
        }
    }

    @DELETE
    @Path("/blocks/{fromService}/{toService}")
    public Response removeBlock(@PathParam("fromService") String fromService,
                                @PathParam("toService") String toService) {
        try {
            meshConfigService.removeTrafficBlock(fromService, toService);
            return Response.noContent().build();
        } catch (Exception e) {
            LOG.errorf(e, "Error removing traffic block from %s to %s", fromService, toService);
            return Response.serverError()
                    .entity(Map.of("error", "Failed to remove traffic block: " + e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/services")
    public List<String> listServices() {
        return meshConfigService.listServices();
    }
}
