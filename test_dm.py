#!/usr/bin/env python3
"""Exercise the DM feature end to end with Flask's test client.
No server, no ports — pure in-process requests against the real app."""
import os, sys, json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
for f in ("chat.db",):
    if os.path.exists(f):
        os.remove(f)

import app as appmod
appmod.init_db()
c = appmod.app.test_client()

fails = []
def check(name, cond, detail=""):
    print(("  PASS  " if cond else "  FAIL  ") + name + ("  " + detail if detail else ""))
    if not cond:
        fails.append(name)

print("=== 1. page + schema ===")
r = c.get("/dm")
check("/dm renders", r.status_code == 200 and b"Direct" in r.data, f"status={r.status_code}")
r = c.get("/chat")
check("/chat still renders + has Direct nav", r.status_code == 200 and b"/dm" in r.data)
import sqlite3
cols = [x[1] for x in sqlite3.connect("chat.db").execute("PRAGMA table_info(dm_messages)")]
check("dm_messages table exists", set(cols) >= {"sender","recipient","message","timestamp","read_at"}, str(cols))

print("\n=== 2. send a DM ===")
r = c.post("/api/dm/Alice", json={"username": "Bob", "message": "hey Alice"})
check("Bob -> Alice 201", r.status_code == 201, str(r.status_code))
r = c.post("/api/dm/Bob", json={"username": "Alice", "message": "hi Bob"})
check("Alice -> Bob 201", r.status_code == 201, str(r.status_code))

print("\n=== 3. read the thread ===")
r = c.get("/api/dm/Alice?me=Bob")
msgs = r.get_json()
check("Bob sees 2 messages", len(msgs) == 2, f"n={len(msgs)}")
check("order is chronological", [m["sender"] for m in msgs] == ["Bob", "Alice"], str([m["sender"] for m in msgs]))

print("\n=== 4. unread semantics ===")
# Reset read state by writing a fresh inbound message, then check unread
c.post("/api/dm/Bob", json={"username": "Alice", "message": "third"})
r = c.get("/api/dm/unread?me=Bob")
check("Bob has 1 unread from Alice", r.get_json()["unread"] == 1, str(r.get_json()))
r = c.get("/api/dm/users?me=Bob")
users = {u["username"]: u for u in r.get_json()}
check("Alice listed for Bob", "Alice" in users, str(list(users)))
check("Alice unread badge = 1", users.get("Alice", {}).get("unread") == 1, str(users.get("Alice")))
# reading the thread clears it
c.get("/api/dm/Alice?me=Bob")
r = c.get("/api/dm/unread?me=Bob")
check("unread cleared after read", r.get_json()["unread"] == 0, str(r.get_json()))

print("\n=== 5. privacy: threads are per-pair ===")
r = c.get("/api/dm/Alice?me=Carol")
check("Carol sees nothing of Bob<->Alice", r.get_json() == [], str(r.get_json()))

print("\n=== 6. validation ===")
r = c.post("/api/dm/Bob", json={"username": "Bob", "message": "self"})
check("self-message rejected", r.status_code == 400, str(r.status_code))
r = c.post("/api/dm/Bob", json={"username": "Alice", "message": "   "})
check("empty message rejected", r.status_code == 400, str(r.status_code))
r = c.post("/api/dm/Bob", json={"message": "no user"})
check("missing username rejected", r.status_code == 400, str(r.status_code))
r = c.get("/api/dm/Bob")
check("thread without me rejected", r.status_code == 400, str(r.status_code))

print("\n=== 7. XSS safety (must store raw, be escaped by the UI) ===")
payload = "<script>alert(1)</script>"
c.post("/api/dm/Alice", json={"username": "Mallory", "message": payload})
r = c.get("/api/dm/Alice?me=Mallory")
check("payload round-trips as data", r.get_json()[-1]["message"] == payload)
check("no raw payload in /dm HTML", payload.encode() not in c.get("/dm").data)

print("\n=== 8. long message truncation ===")
c.post("/api/dm/Alice", json={"username": "Bob", "message": "x" * 5000})
r = c.get("/api/dm/Alice?me=Bob")
check("truncated to 2000", len(r.get_json()[-1]["message"]) == 2000, str(len(r.get_json()[-1]["message"])))

print("\n=== 9. group chat untouched ===")
r = c.post("/send", json={"username": "Bob", "message": "hello room"})
check("main chat still accepts", r.status_code == 201, str(r.status_code))
r = c.get("/messages")
check("main chat still returns", r.status_code == 200 and len(r.get_json()) >= 1)

print("\n" + ("ALL PASS" if not fails else f"{len(fails)} FAILURES: {fails}"))
sys.exit(1 if fails else 0)
