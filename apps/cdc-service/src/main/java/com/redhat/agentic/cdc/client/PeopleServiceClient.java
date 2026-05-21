package com.redhat.agentic.cdc.client;

import com.redhat.agentic.cdc.client.dto.PeopleDto;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "people-api")
@Path("/api/people")
public interface PeopleServiceClient {

    @POST
    PeopleDto create(PeopleDto people);

    @PUT
    @Path("/{ref}")
    PeopleDto update(@PathParam("ref") String ref, PeopleDto people);

    @DELETE
    @Path("/{ref}")
    void delete(@PathParam("ref") String ref);
}
