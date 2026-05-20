package com.redhat.agentic.address;

import jakarta.transaction.Transactional;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@Path("/api/addresses")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AddressResource {

    @GET
    public List<Address> list() {
        return Address.listAll();
    }

    @GET
    @Path("/{ref}")
    public Response get(@PathParam("ref") UUID ref) {
        Address address = Address.findById(ref);
        if (address == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(address).build();
    }

    @POST
    @Transactional
    public Response create(Address address) {
        if (address.ref == null) {
            address.ref = UUID.randomUUID();
        }
        address.persist();
        return Response.status(Response.Status.CREATED).entity(address).build();
    }

    @PUT
    @Path("/{ref}")
    @Transactional
    public Response update(@PathParam("ref") UUID ref, Address address) {
        Address existing = Address.findById(ref);
        if (existing == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        existing.line1 = address.line1;
        existing.line2 = address.line2;
        existing.country = address.country;
        return Response.ok(existing).build();
    }

    @DELETE
    @Path("/{ref}")
    @Transactional
    public Response delete(@PathParam("ref") UUID ref) {
        boolean deleted = Address.deleteById(ref);
        if (!deleted) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.noContent().build();
    }
}
