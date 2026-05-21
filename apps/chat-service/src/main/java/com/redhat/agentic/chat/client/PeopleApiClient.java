package com.redhat.agentic.chat.client;

import java.util.List;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

@Path("/api/people")
@RegisterRestClient(configKey = "people-api")
public interface PeopleApiClient {

    @GET
    List<PersonDto> list();

    @GET
    @Path("/{ref}")
    Response getByRef(@PathParam("ref") String ref);

    class PersonDto {
        public String ref;
        public String firstName;
        public String lastName;
        public String email;
        public AddressDto address;
    }

    class AddressDto {
        public String ref;
        public String line1;
        public String line2;
        public String country;
    }
}
