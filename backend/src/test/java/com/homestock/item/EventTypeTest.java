package com.homestock.item;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

/**
 * The sign rules are the only thing standing between "I used two eggs" and
 * two eggs appearing in the fridge, so they get their own test.
 */
class EventTypeTest {

    private static final BigDecimal PLUS_TWO = new BigDecimal("2");
    private static final BigDecimal MINUS_TWO = new BigDecimal("-2");
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    @Test
    void buyingAddsAndOnlyAdds() {
        assertThat(EventType.PURCHASE.allows(PLUS_TWO)).isTrue();
        assertThat(EventType.PURCHASE.allows(MINUS_TWO)).isFalse();
    }

    @Test
    void anythingLeavingTheHouseMustBeNegative() {
        for (EventType type : new EventType[] {EventType.CONSUME, EventType.DISCARD, EventType.SELL}) {
            assertThat(type.allows(MINUS_TWO)).as("%s with -2", type).isTrue();
            assertThat(type.allows(PLUS_TWO)).as("%s with +2", type).isFalse();
        }
    }

    @Test
    void aRecountCanGoEitherWayButCannotBeNothing() {
        assertThat(EventType.ADJUST.allows(PLUS_TWO)).isTrue();
        assertThat(EventType.ADJUST.allows(MINUS_TWO)).isTrue();
        assertThat(EventType.ADJUST.allows(ZERO)).isFalse();
    }

    @Test
    void noTypeAcceptsAZeroDelta() {
        for (EventType type : EventType.values()) {
            assertThat(type.allows(ZERO)).as("%s with 0", type).isFalse();
        }
    }

    @Test
    void moneyOnlyMovesOnAPurchaseOrASale() {
        assertThat(EventType.PURCHASE.carriesMoney()).isTrue();
        assertThat(EventType.SELL.carriesMoney()).isTrue();
        assertThat(EventType.CONSUME.carriesMoney()).isFalse();
        assertThat(EventType.DISCARD.carriesMoney()).isFalse();
        assertThat(EventType.ADJUST.carriesMoney()).isFalse();
    }
}
