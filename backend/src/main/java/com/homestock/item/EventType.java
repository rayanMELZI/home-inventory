package com.homestock.item;

import java.math.BigDecimal;

/**
 * What happened to an item. The sign of the delta is fixed by the type, so a
 * "consume" can never quietly add stock, and money only moves on the two types
 * where money is actually involved.
 */
public enum EventType {
    PURCHASE(Sign.POSITIVE),
    CONSUME(Sign.NEGATIVE),
    DISCARD(Sign.NEGATIVE),
    SELL(Sign.NEGATIVE),
    /**
     * A recount: "there are actually 3 left". Stored as the delta the client
     * worked out, never as the absolute — deltas commute, absolutes don't, so
     * two devices correcting the same item offline can't clobber each other.
     */
    ADJUST(Sign.EITHER);

    private enum Sign { POSITIVE, NEGATIVE, EITHER }

    private final Sign sign;

    EventType(Sign sign) {
        this.sign = sign;
    }

    public boolean allows(BigDecimal delta) {
        return switch (sign) {
            case POSITIVE -> delta.signum() > 0;
            case NEGATIVE -> delta.signum() < 0;
            case EITHER -> delta.signum() != 0;
        };
    }

    /** True where a unit price is meaningful: money out on a buy, money in on a sale. */
    public boolean carriesMoney() {
        return this == PURCHASE || this == SELL;
    }
}
