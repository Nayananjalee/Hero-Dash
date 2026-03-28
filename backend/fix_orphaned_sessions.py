"""
One-time script: Close orphaned sessions that have no session_end.
Sets session_end to the timestamp of the last attempt within that session,
then computes the same metrics as the end-session endpoint.
"""
import os, sys
import numpy as np
from datetime import datetime

# Use the same DATABASE_URL as the app
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: Set DATABASE_URL environment variable")
    sys.exit(1)

from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker
import models
from database import Base

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    orphaned = db.query(models.SessionMetrics).filter(
        models.SessionMetrics.session_end == None  # noqa: E711
    ).all()

    if not orphaned:
        print("No orphaned sessions found.")
        sys.exit(0)

    print(f"Found {len(orphaned)} orphaned session(s)")

    for session in orphaned:
        # Find the last attempt within this session's timeframe
        last_attempt = db.query(models.Attempt).filter(
            models.Attempt.user_id == session.user_id,
            models.Attempt.timestamp >= session.session_start
        ).order_by(models.Attempt.timestamp.desc()).first()

        if last_attempt:
            session.session_end = last_attempt.timestamp
        else:
            session.session_end = session.session_start  # no attempts — just close it

        # Recompute metrics (same logic as end-session endpoint)
        attempts = db.query(models.Attempt).filter(
            models.Attempt.user_id == session.user_id,
            models.Attempt.timestamp >= session.session_start,
            models.Attempt.timestamp <= session.session_end
        ).order_by(models.Attempt.timestamp.asc()).all()

        if attempts:
            initial_perf = sum(1 for a in attempts[:5] if a.success) / min(5, len(attempts))
            final_perf = sum(1 for a in attempts[-5:] if a.success) / min(5, len(attempts))
            session.initial_performance = initial_perf
            session.final_performance = final_perf
            session.learning_velocity = final_perf - initial_perf

            reaction_times = [a.reaction_time for a in attempts if a.reaction_time > 0]
            if reaction_times:
                session.response_consistency = float(1 / (1 + np.var(reaction_times)))

        duration = (session.session_end - session.session_start).total_seconds()
        print(f"  Session {session.id}: closed ({len(attempts)} attempts, {duration:.0f}s, "
              f"init={session.initial_performance:.2f}, final={session.final_performance:.2f})")

    db.commit()
    print("✅ All orphaned sessions fixed.")
finally:
    db.close()
