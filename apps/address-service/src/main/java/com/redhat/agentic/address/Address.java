package com.redhat.agentic.address;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "address")
public class Address extends PanacheEntityBase {

    @Id
    public UUID ref;

    @Column(name = "line_1", nullable = false)
    public String line1;

    @Column(name = "line_2")
    public String line2;

    @Column(nullable = false)
    public String country;
}
