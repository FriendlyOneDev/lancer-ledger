from supabase import Client


def get_ll_clock_segments(license_level: int) -> int:
    """Get the number of segments for an LL clock based on license level."""
    if 1 <= license_level <= 5:
        return 3
    elif 6 <= license_level <= 9:
        return 4
    elif 10 <= license_level <= 12:
        return 5
    return 3  # Default


def compute_ll_from_ticks(total_ticks: int, starting_ll: int = 0) -> tuple[int, int]:
    """
    Given a total number of LL clock ticks, simulate clock progression
    from starting_ll to compute the final (license_level, ll_clock_progress).

    Each level has a certain number of segments (determined by get_ll_clock_segments).
    When the clock fills, the pilot levels up and the clock resets.
    Max level is 12.
    """
    current_ll = starting_ll
    remaining_ticks = total_ticks

    while remaining_ticks > 0 and current_ll < 12:
        segments = get_ll_clock_segments(current_ll)
        if remaining_ticks >= segments:
            # Clock fills, level up
            remaining_ticks -= segments
            current_ll += 1
        else:
            # Partial fill
            return (current_ll, remaining_ticks)

    if current_ll >= 12:
        # At max level, cap progress to segment count
        segments = get_ll_clock_segments(12)
        return (12, min(remaining_ticks, segments))

    return (current_ll, 0)


def recalculate_clock(db: Client, clock_id: str) -> None:
    """
    Recalculate a clock's filled state from its clock_progress entries
    and manual_ticks.

    Sums all ticks_applied for this clock plus manual_ticks, multiplies by
    the clock's tick_amount, and updates filled/is_completed.
    """
    # Get clock metadata
    clock_result = (
        db.table("clocks")
        .select("segments, tick_amount, manual_ticks")
        .eq("id", clock_id)
        .single()
        .execute()
    )

    if not clock_result.data:
        return

    clock = clock_result.data
    segments = clock["segments"]
    tick_amount = clock["tick_amount"]
    manual_ticks = clock.get("manual_ticks", 0)

    # Sum all ticks applied to this clock from log entries
    progress_result = (
        db.table("clock_progress")
        .select("ticks_applied")
        .eq("clock_id", clock_id)
        .execute()
    )

    log_ticks = sum(row["ticks_applied"] for row in progress_result.data)
    total_ticks = log_ticks + manual_ticks
    filled = max(0, min(total_ticks * tick_amount, segments))
    is_completed = filled >= segments

    db.table("clocks").update({
        "filled": filled,
        "is_completed": is_completed,
    }).eq("id", clock_id).execute()


def recalculate_pilot_clocks(db: Client, pilot_id: str) -> None:
    """Recalculate all clocks for a pilot from their clock_progress entries."""
    clocks_result = (
        db.table("clocks")
        .select("id")
        .eq("pilot_id", pilot_id)
        .execute()
    )

    for clock_row in clocks_result.data:
        recalculate_clock(db, clock_row["id"])


def recalculate_pilot_resources(db: Client, pilot_id: str) -> None:
    """
    Recalculate a pilot's resources and clocks by summing all their log entries.

    Queries all log_entries for the pilot, sums manna_change, downtime_change,
    and ll_clock_change, then computes license level from total ticks and
    updates the pilot row. Also recalculates all clock states.
    """
    result = (
        db.table("log_entries")
        .select("manna_change, downtime_change, ll_clock_change")
        .eq("pilot_id", pilot_id)
        .execute()
    )

    total_manna = 0
    total_downtime = 0
    total_ll_ticks = 0

    for log in result.data:
        total_manna += log["manna_change"]
        total_downtime += log["downtime_change"]
        total_ll_ticks += log["ll_clock_change"]

    # Compute license level from total ticks (starting from LL 0)
    license_level, ll_clock_progress = compute_ll_from_ticks(total_ll_ticks, starting_ll=0)

    db.table("pilots").update({
        "manna": total_manna,
        "downtime": total_downtime,
        "license_level": license_level,
        "ll_clock_progress": ll_clock_progress,
    }).eq("id", pilot_id).execute()

    # Recalculate all clock states
    recalculate_pilot_clocks(db, pilot_id)
