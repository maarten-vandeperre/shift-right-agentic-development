package com.redhat.agentic.cdc.model;

public class CdcEvent {

    private String timestamp;
    private String table;
    private String operation;
    private String ref;
    private String payload;
    private String before;

    public CdcEvent() {
    }

    public CdcEvent(String timestamp, String table, String operation, String ref, String payload, String before) {
        this.timestamp = timestamp;
        this.table = table;
        this.operation = operation;
        this.ref = ref;
        this.payload = payload;
        this.before = before;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getTable() {
        return table;
    }

    public void setTable(String table) {
        this.table = table;
    }

    public String getOperation() {
        return operation;
    }

    public void setOperation(String operation) {
        this.operation = operation;
    }

    public String getRef() {
        return ref;
    }

    public void setRef(String ref) {
        this.ref = ref;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public String getBefore() {
        return before;
    }

    public void setBefore(String before) {
        this.before = before;
    }
}
