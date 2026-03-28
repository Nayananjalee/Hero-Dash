"""Inspect database contents to diagnose missing data issues."""
import os
os.environ['DATABASE_URL'] = 'postgresql://neondb_owner:npg_p0U1dBcxOZYj@ep-super-frog-ai163y6u-pooler.c-4.us-east-1.aws.neon.tech/Hero-Dash?sslmode=require'

from sqlalchemy import create_engine, text
engine = create_engine(os.environ['DATABASE_URL'], pool_pre_ping=True)

with engine.connect() as conn:
    # List all tables
    result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
    print('=== TABLES ===')
    for row in result:
        print(f'  {row[0]}')
    print()
    
    # Check users
    result = conn.execute(text('SELECT id, username, age_group, hearing_level, current_level, total_score, created_at FROM users ORDER BY id'))
    print('=== USERS ===')
    for row in result:
        print(f'  id={row[0]}, name={row[1]}, age={row[2]}, hearing={row[3]}, level={row[4]}, score={row[5]}, created={row[6]}')
    print()
    
    # Check attempts count per user
    result = conn.execute(text('SELECT user_id, COUNT(*) as cnt, SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes FROM attempts GROUP BY user_id ORDER BY user_id'))
    print('=== ATTEMPTS PER USER ===')
    for row in result:
        print(f'  user={row[0]}, total={row[1]}, successes={row[2]}')
    print()
    
    # Check recent attempts
    result = conn.execute(text('SELECT user_id, scenario_type, success, reaction_time, difficulty_level, noise_level, game_mode, timestamp FROM attempts ORDER BY timestamp DESC LIMIT 20'))
    print('=== RECENT ATTEMPTS (last 20) ===')
    for row in result:
        print(f'  user={row[0]}, type={row[1]}, success={row[2]}, rt={row[3]:.2f}s, diff={row[4]}, noise={row[5]}, mode={row[6]}, time={row[7]}')
    print()
    
    # Check session metrics
    result = conn.execute(text('SELECT id, user_id, session_start, session_end, initial_performance, final_performance, learning_velocity, response_consistency FROM session_metrics ORDER BY session_start DESC LIMIT 10'))
    print('=== SESSION METRICS (last 10) ===')
    for row in result:
        print(f'  id={row[0]}, user={row[1]}, start={row[2]}, end={row[3]}, init_perf={row[4]}, final_perf={row[5]}, velocity={row[6]}, consistency={row[7]}')
    print()
    
    # Count all tables
    tables = ['users', 'attempts', 'session_metrics', 'learning_profiles', 'bkt_skill_states', 
              'skill_memory', 'assessment_sessions', 'audiogram_data', 'clinical_assessments', 'irt_item_parameters']
    print('=== TABLE COUNTS ===')
    for t in tables:
        try:
            result = conn.execute(text(f'SELECT COUNT(*) FROM {t}'))
            print(f'  {t}: {result.scalar()}')
        except Exception as e:
            print(f'  {t}: ERROR - {e}')
    print()
    
    # Check learning profiles
    result = conn.execute(text('SELECT user_id, avg_reaction_time, reaction_time_variance FROM learning_profiles'))
    print('=== LEARNING PROFILES ===')
    for row in result:
        print(f'  user={row[0]}, avg_rt={row[1]}, rt_var={row[2]}')
    print()
    
    # Check BKT states
    result = conn.execute(text('SELECT user_id, skill_name, p_learned, total_attempts, mastery_achieved FROM bkt_skill_states ORDER BY user_id, skill_name'))
    print('=== BKT SKILL STATES ===')
    for row in result:
        print(f'  user={row[0]}, skill={row[1]}, P(L)={row[2]:.4f}, attempts={row[3]}, mastered={row[4]}')
    print()
    
    # Check skill memory (spaced repetition)
    result = conn.execute(text('SELECT user_id, scenario_type, repetition_number, easiness_factor, memory_strength, last_practiced FROM skill_memory ORDER BY user_id'))
    print('=== SKILL MEMORY (SM-2) ===')
    for row in result:
        print(f'  user={row[0]}, type={row[1]}, reps={row[2]}, EF={row[3]:.2f}, strength={row[4]:.2f}, last={row[5]}')
    print()
    
    # Check audiogram data
    result = conn.execute(text('SELECT user_id, threshold_250hz, threshold_500hz, threshold_1000hz, threshold_2000hz, threshold_4000hz, threshold_8000hz, hearing_aid_type FROM audiogram_data'))
    print('=== AUDIOGRAM DATA ===')
    for row in result:
        print(f'  user={row[0]}, 250={row[1]}, 500={row[2]}, 1k={row[3]}, 2k={row[4]}, 4k={row[5]}, 8k={row[6]}, aid={row[7]}')
