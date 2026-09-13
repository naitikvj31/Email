#!/bin/bash

# Extract lines 200000-400000, then filter for good .com/.in emails
# Rules:
#   - Only .com and .in domains
#   - Domain name part must be > 2 chars
#   - No digits in domain
#   - No hyphen in domain
#   - No digits in username (before @)
#   - No blocked domains (loaded from blocked_domains.txt) or usernames
#   - 1 email per domain max
#   - Max 10000 results

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BLOCKED_FILE="$SCRIPT_DIR/blocked_domains.txt"

if [ ! -f "$BLOCKED_FILE" ]; then
  echo "ERROR: blocked_domains.txt not found at $BLOCKED_FILE"
  exit 1
fi

sed -n '200000,400000p' "$SCRIPT_DIR/output (4).txt" | \
awk -F'[:;|,\t]' -v blocked_file="$BLOCKED_FILE" '
BEGIN {
  # Load blocked domains from file
  while ((getline line < blocked_file) > 0) {
    gsub(/^[ \t]+|[ \t]+$/, "", line)
    if (line != "") blocked_exact[tolower(line)] = 1
  }
  close(blocked_file)

  split("mail,web,yahoo,hotmail,gmail,garmerspace,vnetwork,sina,mimo,sion", blocked_partial, ",")
  split("admin,contact,user,hello,help,candidate,support,shop,validate,verify,office,mail,postmaster,info", blocked_users, ",")
  count = 0
  max = 10000
}
{
  fullline = $0
  gsub(/^[ \t]+|[ \t]+$/, "", fullline)
  if (fullline == "") next
  line = $1
  gsub(/^[ \t]+|[ \t]+$/, "", line)

  # Extract email
  email = ""
  if (match(line, /[^ @]+@[^ @]+\.[^ @]+/)) {
    email = substr(line, RSTART, RLENGTH)
  } else {
    next
  }

  # Lowercase
  em_lower = tolower(email)

  # Must end with .com or .in
  if (em_lower !~ /\.(com|in)$/) next

  # Get domain
  split(em_lower, eparts, "@")
  domain = eparts[2]
  if (domain == "") next

  # Domain name part (before first dot)
  split(domain, dparts, ".")
  dname = dparts[1]

  # Block 2-char or less domain names
  if (length(dname) <= 2) next

  # Block digits in domain
  if (domain ~ /[0-9]/) next

  # Block hyphens in domain
  if (domain ~ /-/) next

  # Block exact domain matches (from file)
  if (tolower(domain) in blocked_exact) next

  # Block partial domain matches
  blocked = 0
  for (i in blocked_partial) {
    if (index(domain, blocked_partial[i]) > 0) { blocked = 1; break }
  }
  if (blocked) next

  # Block usernames containing digits (0-9)
  split(em_lower, uparts, "@")
  localpart = uparts[1]
  if (localpart ~ /[0-9]/) next

  # Block usernames with blocked keywords
  for (i in blocked_users) {
    if (index(localpart, blocked_users[i]) > 0) { blocked = 1; break }
  }
  if (blocked) next

  # 1 per domain
  if (seen_domain[domain]) next
  seen_domain[domain] = 1

  # Deduplicate by email
  if (seen_email[em_lower]) next
  seen_email[em_lower] = 1

  print fullline
  count++
  if (count >= max) exit
}' > "$SCRIPT_DIR/good_10k.txt"

result_count=$(wc -l < "$SCRIPT_DIR/good_10k.txt")
echo "Extracted $result_count good emails to good_10k.txt"

