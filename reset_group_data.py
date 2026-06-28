#!/usr/bin/env python3
"""
Reset ONE group to a clean slate — keeps the group + its members + settings, wipes all
expenses, splits, contributions, settlements, the activity journal, notifications and any
pending invitations. Safe by design: backs the DB up first and DRY-RUNS unless you pass --yes.

Usage (on PythonAnywhere, from your home dir so it targets the LIVE db):
    python ~/MasterSplitter/reset_group_data.py                 # dry run — shows what WOULD be deleted
    python ~/MasterSplitter/reset_group_data.py --yes           # actually reset (after a backup)

Options:
    --name "<text>"   group-name substring to match (default: מונטנגרו)
    --db   <path>     sqlite db path (default: ~/master_splitter.db, the live PA database)
    --yes             perform the delete (otherwise it's a dry run)
"""
import argparse, os, shutil, sqlite3, sys
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding="utf-8")   # print Hebrew group names safely everywhere
except Exception:
    pass

ap = argparse.ArgumentParser()
ap.add_argument("--name", default="מונטנגרו")
ap.add_argument("--db", default=os.path.expanduser("~/master_splitter.db"))
ap.add_argument("--yes", action="store_true")
args = ap.parse_args()

if not os.path.exists(args.db):
    sys.exit(f"DB not found: {args.db}")

conn = sqlite3.connect(args.db)
conn.row_factory = sqlite3.Row
c = conn.cursor()

groups = c.execute("SELECT id, destination FROM Groups WHERE destination LIKE ?", (f"%{args.name}%",)).fetchall()
if not groups:
    sys.exit(f"No group whose name contains '{args.name}'.")
if len(groups) > 1:
    print("Multiple groups match — refine --name. Matches:")
    for g in groups:
        print(f"  id={g['id']}  name={g['destination']}")
    sys.exit(1)

gid, gname = groups[0]["id"], groups[0]["destination"]
members = c.execute("SELECT COUNT(*) n FROM GroupMembers WHERE group_id=?", (gid,)).fetchone()["n"]

# What will be wiped (group_id-scoped tables; splits/contributions go via expense_id).
exp_ids = [r["id"] for r in c.execute("SELECT id FROM Expenses WHERE group_id=?", (gid,)).fetchall()]
def count(sql, params):
    return c.execute(sql, params).fetchone()[0]
qmarks = ",".join("?" * len(exp_ids)) or "NULL"
counts = {
    "ExpenseSplits":        count(f"SELECT COUNT(*) FROM ExpenseSplits WHERE expense_id IN ({qmarks})", exp_ids) if exp_ids else 0,
    "ExpenseContributions": count(f"SELECT COUNT(*) FROM ExpenseContributions WHERE expense_id IN ({qmarks})", exp_ids) if exp_ids else 0,
    "Expenses":             len(exp_ids),
    "Settlements":          count("SELECT COUNT(*) FROM Settlements WHERE group_id=?", (gid,)),
    "ActivityLog":          count("SELECT COUNT(*) FROM ActivityLog WHERE group_id=?", (gid,)),
    "Notifications":        count("SELECT COUNT(*) FROM Notifications WHERE group_id=?", (gid,)),
    "group_invitations":    count("SELECT COUNT(*) FROM group_invitations WHERE group_id=?", (gid,)),
}

print("=" * 60)
print(f"Group:    [{gid}] {gname}")
print(f"Members:  {members}  (KEPT — never touched)")
print("Will delete:")
for t, n in counts.items():
    print(f"  {t:22} {n}")
print("=" * 60)

if not args.yes:
    print("DRY RUN — nothing deleted. Re-run with --yes to perform the reset.")
    conn.close()
    sys.exit(0)

# Back up the DB first.
ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
backup = f"{args.db}.bak_{ts}"
shutil.copy2(args.db, backup)
print(f"Backup written: {backup}")

try:
    if exp_ids:
        c.execute(f"DELETE FROM ExpenseSplits        WHERE expense_id IN ({qmarks})", exp_ids)
        c.execute(f"DELETE FROM ExpenseContributions WHERE expense_id IN ({qmarks})", exp_ids)
    c.execute("DELETE FROM Expenses          WHERE group_id=?", (gid,))
    c.execute("DELETE FROM Settlements       WHERE group_id=?", (gid,))
    c.execute("DELETE FROM ActivityLog       WHERE group_id=?", (gid,))
    c.execute("DELETE FROM Notifications     WHERE group_id=?", (gid,))
    c.execute("DELETE FROM group_invitations WHERE group_id=?", (gid,))
    conn.commit()
    print(f"DONE — group [{gid}] {gname} reset to a clean slate. {members} members kept.")
except Exception as e:
    conn.rollback()
    print(f"ERROR (rolled back): {e}  — restore from {backup} if needed.")
    sys.exit(1)
finally:
    conn.close()
