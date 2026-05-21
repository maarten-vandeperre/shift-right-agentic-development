package com.redhat.agentic.mesh.model;

public class FaultConfig {

    private String serviceName;
    private String faultType;
    private int percentage;
    private int delayMs;
    private int abortCode;
    private boolean enabled;

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public String getFaultType() {
        return faultType;
    }

    public void setFaultType(String faultType) {
        this.faultType = faultType;
    }

    public int getPercentage() {
        return percentage;
    }

    public void setPercentage(int percentage) {
        this.percentage = percentage;
    }

    public int getDelayMs() {
        return delayMs;
    }

    public void setDelayMs(int delayMs) {
        this.delayMs = delayMs;
    }

    public int getAbortCode() {
        return abortCode;
    }

    public void setAbortCode(int abortCode) {
        this.abortCode = abortCode;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}
