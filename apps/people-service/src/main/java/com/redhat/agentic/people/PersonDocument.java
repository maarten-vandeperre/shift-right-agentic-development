package com.redhat.agentic.people;

import io.quarkus.mongodb.panache.PanacheMongoEntity;
import io.quarkus.mongodb.panache.common.MongoEntity;

@MongoEntity(collection = "people")
public class PersonDocument extends PanacheMongoEntity {

    private String ref;
    private String firstName;
    private String lastName;
    private String email;
    private AddressDocument address;

    public PersonDocument() {
    }

    public String getRef() {
        return ref;
    }

    public void setRef(String ref) {
        this.ref = ref;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public AddressDocument getAddress() {
        return address;
    }

    public void setAddress(AddressDocument address) {
        this.address = address;
    }

    public static PersonDocument findByRef(String ref) {
        return find("ref", ref).firstResult();
    }

    public static long deleteByRef(String ref) {
        return delete("ref", ref);
    }
}
