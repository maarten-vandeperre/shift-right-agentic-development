package com.redhat.agentic.person;

import java.util.List;
import java.util.UUID;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/persons")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class PersonResource {

    @GET
    public List<Person> listAll() {
        return Person.listAll();
    }

    @GET
    @Path("/{ref}")
    public Response getByRef(@PathParam("ref") UUID ref) {
        Person person = Person.findById(ref);
        if (person == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(person).build();
    }

    @POST
    @Transactional
    public Response create(Person person) {
        if (person.ref == null) {
            person.ref = UUID.randomUUID();
        }
        person.persist();
        return Response.status(Response.Status.CREATED).entity(person).build();
    }

    @PUT
    @Path("/{ref}")
    @Transactional
    public Response update(@PathParam("ref") UUID ref, Person updated) {
        Person person = Person.findById(ref);
        if (person == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        person.firstName = updated.firstName;
        person.lastName = updated.lastName;
        person.email = updated.email;
        person.addressRef = updated.addressRef;
        return Response.ok(person).build();
    }

    @DELETE
    @Path("/{ref}")
    @Transactional
    public Response delete(@PathParam("ref") UUID ref) {
        boolean deleted = Person.deleteById(ref);
        if (!deleted) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.noContent().build();
    }
}
