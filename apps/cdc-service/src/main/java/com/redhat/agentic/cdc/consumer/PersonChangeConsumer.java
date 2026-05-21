package com.redhat.agentic.cdc.consumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.redhat.agentic.cdc.client.AddressServiceClient;
import com.redhat.agentic.cdc.client.PeopleServiceClient;
import com.redhat.agentic.cdc.client.dto.AddressDto;
import com.redhat.agentic.cdc.client.dto.PeopleDto;
import com.redhat.agentic.cdc.model.CdcEvent;
import com.redhat.agentic.cdc.service.CdcEventBroadcaster;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.time.Instant;

@ApplicationScoped
public class PersonChangeConsumer {

    private static final Logger LOG = Logger.getLogger(PersonChangeConsumer.class);

    @Inject
    ObjectMapper objectMapper;

    @Inject
    @RestClient
    AddressServiceClient addressServiceClient;

    @Inject
    @RestClient
    PeopleServiceClient peopleServiceClient;

    @Inject
    CdcEventBroadcaster broadcaster;

    @Incoming("person-changes")
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
            String beforePayload = null;

            switch (op) {
                case "r":
                    operation = "SNAPSHOT";
                    ref = after.path("ref").asText();
                    payload = after.toString();
                    syncPersonToPeople(after);
                    break;
                case "c":
                    operation = "CREATE";
                    ref = after.path("ref").asText();
                    payload = after.toString();
                    syncPersonToPeople(after);
                    break;
                case "u":
                    operation = "UPDATE";
                    ref = after.path("ref").asText();
                    payload = after.toString();
                    beforePayload = before.isMissingNode() || before.isNull() ? null : before.toString();
                    syncPersonToPeople(after);
                    break;
                case "d":
                    operation = "DELETE";
                    ref = before.path("ref").asText();
                    payload = before.toString();
                    deletePersonFromPeople(ref);
                    break;
                default:
                    LOG.debugv("Ignoring operation: {0}", op);
                    return;
            }

            CdcEvent event = new CdcEvent(
                    Instant.now().toString(),
                    "person",
                    operation,
                    ref,
                    payload,
                    beforePayload
            );
            broadcaster.broadcast(event);
            LOG.infov("Processed person CDC event: {0} {1}", operation, ref);

        } catch (Exception e) {
            LOG.error("Failed to process person CDC event", e);
        }
    }

    private void syncPersonToPeople(JsonNode personData) {
        try {
            String ref = personData.path("ref").asText();
            String firstName = personData.path("first_name").asText(null);
            String lastName = personData.path("last_name").asText(null);
            String email = personData.path("email").asText(null);
            String addressRef = personData.path("address_ref").asText(null);

            AddressDto address = null;
            if (addressRef != null && !addressRef.isEmpty()) {
                try {
                    address = addressServiceClient.getByRef(addressRef);
                } catch (Exception e) {
                    LOG.warnv("Could not fetch address {0}: {1}", addressRef, e.getMessage());
                }
            }

            PeopleDto people = new PeopleDto();
            people.setRef(ref);
            people.setFirstName(firstName);
            people.setLastName(lastName);
            people.setEmail(email);
            people.setAddress(address);

            try {
                peopleServiceClient.update(ref, people);
            } catch (Exception e) {
                LOG.debugv("Update failed for {0}, trying create: {1}", ref, e.getMessage());
                peopleServiceClient.create(people);
            }
        } catch (Exception e) {
            LOG.error("Failed to sync person to people-service", e);
        }
    }

    private void deletePersonFromPeople(String ref) {
        try {
            peopleServiceClient.delete(ref);
        } catch (Exception e) {
            LOG.warnv("Failed to delete person {0} from people-service: {1}", ref, e.getMessage());
        }
    }
}
