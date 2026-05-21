package com.redhat.agentic.cdc.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.redhat.agentic.cdc.client.AddressServiceClient;
import com.redhat.agentic.cdc.client.PeopleServiceClient;
import com.redhat.agentic.cdc.client.PersonServiceClient;
import com.redhat.agentic.cdc.client.dto.AddressDto;
import com.redhat.agentic.cdc.client.dto.PeopleDto;
import com.redhat.agentic.cdc.client.dto.PersonDto;
import com.redhat.agentic.cdc.model.CdcEvent;
import com.redhat.agentic.cdc.service.CdcEventBroadcaster;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.time.Instant;
import java.util.List;

@ApplicationScoped
public class AddressChangeConsumer {

    private static final Logger LOG = Logger.getLogger(AddressChangeConsumer.class);

    @Inject
    ObjectMapper objectMapper;

    @Inject
    @RestClient
    PersonServiceClient personServiceClient;

    @Inject
    @RestClient
    AddressServiceClient addressServiceClient;

    @Inject
    @RestClient
    PeopleServiceClient peopleServiceClient;

    @Inject
    CdcEventBroadcaster broadcaster;

    @Incoming("address-changes")
    public void consume(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            JsonNode envelope = root.has("payload") ? root.path("payload") : root;
            String op = envelope.path("op").asText();
            JsonNode after = envelope.path("after");
            JsonNode before = envelope.path("before");

            String operation;
            String ref;
            String payload;

            switch (op) {
                case "c":
                    operation = "CREATE";
                    ref = after.path("ref").asText();
                    payload = after.toString();
                    break;
                case "u":
                    operation = "UPDATE";
                    ref = after.path("ref").asText();
                    payload = after.toString();
                    rebuildPeopleForAddress(ref);
                    break;
                case "d":
                    operation = "DELETE";
                    ref = before.path("ref").asText();
                    payload = before.toString();
                    rebuildPeopleForAddress(ref);
                    break;
                default:
                    LOG.debugv("Ignoring operation: {0}", op);
                    return;
            }

            CdcEvent event = new CdcEvent(
                    Instant.now().toString(),
                    "address",
                    operation,
                    ref,
                    payload
            );
            broadcaster.broadcast(event);
            LOG.infov("Processed address CDC event: {0} {1}", operation, ref);

        } catch (Exception e) {
            LOG.error("Failed to process address CDC event", e);
        }
    }

    private void rebuildPeopleForAddress(String addressRef) {
        try {
            List<PersonDto> allPersons = personServiceClient.getAll();
            List<PersonDto> matching = allPersons.stream()
                    .filter(p -> addressRef.equals(p.getAddressRef()))
                    .toList();

            AddressDto address = null;
            try {
                address = addressServiceClient.getByRef(addressRef);
            } catch (Exception e) {
                LOG.warnv("Could not fetch address {0}: {1}", addressRef, e.getMessage());
            }

            for (PersonDto person : matching) {
                try {
                    PeopleDto people = new PeopleDto();
                    people.setRef(person.getRef());
                    people.setFirstName(person.getFirstName());
                    people.setLastName(person.getLastName());
                    people.setEmail(person.getEmail());
                    people.setAddress(address);

                    try {
                        peopleServiceClient.update(person.getRef(), people);
                    } catch (Exception e) {
                        LOG.debugv("Update failed for {0}, trying create: {1}", person.getRef(), e.getMessage());
                        peopleServiceClient.create(people);
                    }
                } catch (Exception e) {
                    LOG.errorv("Failed to rebuild people document for person {0}: {1}", person.getRef(), e.getMessage());
                }
            }
        } catch (Exception e) {
            LOG.error("Failed to rebuild people documents for address " + addressRef, e);
        }
    }
}
