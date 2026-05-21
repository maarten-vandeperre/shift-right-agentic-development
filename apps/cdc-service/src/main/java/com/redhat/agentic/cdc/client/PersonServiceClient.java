package com.redhat.agentic.cdc.client;

import com.redhat.agentic.cdc.client.dto.PersonDto;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.util.List;

@RegisterRestClient(configKey = "person-api")
@Path("/api/persons")
public interface PersonServiceClient {

    @GET
    List<PersonDto> getAll();

    @GET
    @Path("/{ref}")
    PersonDto getByRef(@PathParam("ref") String ref);
}
