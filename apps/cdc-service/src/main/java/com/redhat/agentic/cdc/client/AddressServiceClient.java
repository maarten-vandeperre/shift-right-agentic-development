package com.redhat.agentic.cdc.client;

import com.redhat.agentic.cdc.client.dto.AddressDto;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "address-api")
@Path("/api/addresses")
public interface AddressServiceClient {

    @GET
    @Path("/{ref}")
    AddressDto getByRef(@PathParam("ref") String ref);
}
