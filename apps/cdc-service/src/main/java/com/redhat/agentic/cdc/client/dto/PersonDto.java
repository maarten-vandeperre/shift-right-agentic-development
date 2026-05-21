package com.redhat.agentic.cdc.client.dto;

public class PersonDto {

    private String ref;
    private String firstName;
    private String lastName;
    private String email;
    private String addressRef;

    public PersonDto() {
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

    public String getAddressRef() {
        return addressRef;
    }

    public void setAddressRef(String addressRef) {
        this.addressRef = addressRef;
    }
}
