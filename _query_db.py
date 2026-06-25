import sqlite3
import json
import sys
import io
from datetime import datetime, timezone

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DB_PATH = r"C:\Users\Elberth\.local\share\mimocode\mimocode.db"
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

PROJECT_ID = '747abb91-e888-4e10-bacd-3639a5098109'

# Focus: get user messages from ses_119093881ffez9VoET9sJy1mBr (2026-06-20) and ses_11e759216ffeat3ABj3w2AXfwG (2026-06-19)
# These are sessions NOT yet in recent checkpoints but within 7 days

sessions_to_check = [
    ('ses_119093881ffez9VoET9sJy1mBr', '2026-06-20'),
    ('ses_11e759216ffeat3ABj3w2AXfwG', '2026-06-19'),
    ('ses_11f0494a2ffegML8GSLRdqoHP5', '2026-06-19'),
    ('ses_12099a3e2ffesEg9G6WPyJt1JI', '2026-06-19'),
    ('ses_122d88f40ffezbwcP9Fko3u2J2', '2026-06-18'),
    ('ses_1237bb090ffeKplHFLgoIowJR2', '2026-06-18'),
]

for sess_id, date in sessions_to_check:
    print(f"\n=== {sess_id} | {date} ===")
    
    # Get session title
    c.execute("SELECT title FROM session WHERE id = ?", (sess_id,))
    row = c.fetchone()
    if row:
        print(f"Title: {row[0]}")
    
    # Get user messages
    c.execute("""
        SELECT m.id, m.time_created,
               (SELECT GROUP_CONCAT(
                   CASE WHEN json_extract(p.data, '$.type') = 'text' 
                        THEN substr(json_extract(p.data, '$.text'), 1, 500)
                        ELSE NULL END, '|||')
                FROM part p WHERE p.message_id = m.id) as text_content
        FROM message m
        WHERE m.session_id = ?
          AND json_extract(m.data, '$.role') = 'user'
        ORDER BY m.time_created
    """, (sess_id,))
    
    for msg_id, msg_ts, text in c.fetchall():
        if not text:
            continue
        text_lower = text.lower()
        keywords = ['sempre', 'nunca', 'regra', 'decidi', 'quero', 'prefiro', 'não quero',
                    'errado', 'certo', 'deploy', 'test', 'bug', 'problema', 
                    'desktop', 'mobile', 'barbeiro', 'horário', 'slot', 'senha',
                    'email', 'reset', 'booking', 'admin', 'perfil', 'cliente',
                    'reagendamento', 'perfil', 'ta bom', 'odeio', 'gosto']
        
        for kw in keywords:
            if kw in text_lower:
                ts_str = datetime.fromtimestamp(msg_ts/1000, tz=timezone.utc).strftime('%H:%M')
                preview = text[:350].replace('\n', ' ').replace('\r', '')
                print(f"  [{ts_str}] (kw:{kw}) {preview}")
                break

# Also check: what are the latest session notes?
print("\n\n=== RECENT SESSION NOTES FILES ===")
c.execute("""
    SELECT s.id, s.title, s.time_created
    FROM session s
    WHERE s.project_id = ? AND s.parent_id IS NULL
    ORDER BY s.time_created DESC
    LIMIT 5
""", (PROJECT_ID,))
for row in c.fetchall():
    ts = datetime.fromtimestamp(row[2]/1000, tz=timezone.utc).strftime('%Y-%m-%d %H:%M')
    print(f"  {row[0]} | {ts} | {row[1][:60]}")

conn.close()
