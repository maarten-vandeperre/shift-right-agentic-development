package com.redhat.agentic.people;

import java.util.List;
import java.util.UUID;

import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

@Path("/api/people")
public class PeopleResource {

    @GET
    public List<PersonDocument> list() {
        return PersonDocument.listAll();
    }

    @GET
    @Path("/{ref}")
    public Response getByRef(@PathParam("ref") String ref) {
        PersonDocument person = PersonDocument.findByRef(ref);
        if (person == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(person).build();
    }

    @POST
    public Response create(PersonDocument person) {
        if (person.getRef() == null || person.getRef().isBlank()) {
            person.setRef(UUID.randomUUID().toString());
        }
        if (person.getAddress() != null
                && (person.getAddress().getRef() == null || person.getAddress().getRef().isBlank())) {
            person.getAddress().setRef(UUID.randomUUID().toString());
        }
        person.persist();
        return Response.status(Response.Status.CREATED).entity(person).build();
    }

    @PUT
    @Path("/{ref}")
    public Response update(@PathParam("ref") String ref, PersonDocument updated) {
        PersonDocument existing = PersonDocument.findByRef(ref);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        existing.setEmail(updated.getEmail());
        existing.setAddress(updated.getAddress());
        existing.update();
        return Response.ok(existing).build();
    }

    @DELETE
    @Path("/{ref}")
    public Response delete(@PathParam("ref") String ref) {
        long deleted = PersonDocument.deleteByRef(ref);
        if (deleted == 0) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.noContent().build();
    }
}
