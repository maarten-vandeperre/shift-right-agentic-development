package com.redhat.agentic.cdc.service;

import com.redhat.agentic.cdc.model.CdcEvent;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class CdcEventBroadcaster {

    private final BroadcastProcessor<CdcEvent> processor = BroadcastProcessor.create();

    public void broadcast(CdcEvent event) {
        processor.onNext(event);
    }

    public Multi<CdcEvent> stream() {
        return processor;
    }
}
