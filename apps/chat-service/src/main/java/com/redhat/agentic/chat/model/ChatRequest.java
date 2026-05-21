package com.redhat.agentic.chat.model;

public class ChatRequest {

    private String question;
    private String orchestratorUrl;
    private String orchestratorApiKey;
    private String orchestratorModel;
    private String locationUrl;
    private String locationApiKey;
    private String locationModel;

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getOrchestratorUrl() {
        return orchestratorUrl;
    }

    public void setOrchestratorUrl(String orchestratorUrl) {
        this.orchestratorUrl = orchestratorUrl;
    }

    public String getOrchestratorApiKey() {
        return orchestratorApiKey;
    }

    public void setOrchestratorApiKey(String orchestratorApiKey) {
        this.orchestratorApiKey = orchestratorApiKey;
    }

    public String getOrchestratorModel() {
        return orchestratorModel;
    }

    public void setOrchestratorModel(String orchestratorModel) {
        this.orchestratorModel = orchestratorModel;
    }

    public String getLocationUrl() {
        return locationUrl;
    }

    public void setLocationUrl(String locationUrl) {
        this.locationUrl = locationUrl;
    }

    public String getLocationApiKey() {
        return locationApiKey;
    }

    public void setLocationApiKey(String locationApiKey) {
        this.locationApiKey = locationApiKey;
    }

    public String getLocationModel() {
        return locationModel;
    }

    public void setLocationModel(String locationModel) {
        this.locationModel = locationModel;
    }
}
