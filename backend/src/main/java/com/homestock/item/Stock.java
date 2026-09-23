package com.homestock.item;

import java.math.BigDecimal;

/**
 * The one rule about how much of something there is.
 *
 * It lives on its own because two callers need it — a tap on the pantry screen
 * and a batch arriving from a device that was offline — and a second copy of
 * this arithmetic is how the two would eventually disagree.
 */
public final class Stock {

    /**
     * What a requested delta actually comes to against the stock on hand.
     *
     * You cannot use more than you have, so a negative delta is trimmed to
     * what was there. The TRIMMED value is what gets stored, which is the
     * whole point: an item's quantity must stay the exact sum of its deltas.
     * Clamping the total instead would be order-dependent, and two devices
     * replaying the same events in a different order would settle on
     * different numbers.
     *
     * <p>Returns zero when there is nothing left to take, which callers treat
     * as "refuse this" rather than storing an event that did nothing.
     */
    public static BigDecimal effectiveDelta(BigDecimal onHand, BigDecimal requested) {
        return requested.signum() < 0 ? requested.max(onHand.negate()) : requested;
    }

    private Stock() {}
}
