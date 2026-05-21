package com.redhat.agentic.cdc.resource;

import com.redhat.agentic.cdc.model.CdcEvent;
import com.redhat.agentic.cdc.service.CdcEventBroadcaster;
import io.smallrye.mutiny.Multi;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.RestStreamElementType;

import java.util.List;

@Path("/api/cdc")
public class CdcEventsResource {

    @Inject
    CdcEventBroadcaster broadcaster;

    @GET
    @Path("/events")
    @Produces(MediaType.SERVER_SENT_EVENTS)
    @RestStreamElementType(MediaType.APPLICATION_JSON)
    public Multi<CdcEvent> stream() {
        return broadcaster.stream();
    }

    @GET
    @Path("/history")
    @Produces(MediaType.APPLICATION_JSON)
    public List<CdcEvent> history() {
        return broadcaster.getHistory();
    }
}
