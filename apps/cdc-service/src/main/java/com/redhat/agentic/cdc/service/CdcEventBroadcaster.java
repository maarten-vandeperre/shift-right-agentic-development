package com.redhat.agentic.cdc.service;

import com.redhat.agentic.cdc.model.CdcEvent;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.operators.multi.processors.BroadcastProcessor;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@ApplicationScoped
public class CdcEventBroadcaster {

    private static final int MAX_HISTORY = 500;

    private final BroadcastProcessor<CdcEvent> processor = BroadcastProcessor.create();
    private final CopyOnWriteArrayList<CdcEvent> history = new CopyOnWriteArrayList<>();

    public void broadcast(CdcEvent event) {
        history.add(event);
        if (history.size() > MAX_HISTORY) {
            history.subList(0, history.size() - MAX_HISTORY).clear();
        }
        processor.onNext(event);
    }

    public Multi<CdcEvent> stream() {
        return processor;
    }

    public List<CdcEvent> getHistory() {
        return Collections.unmodifiableList(new ArrayList<>(history));
    }
}
