#!/bin/bash

# Extract lines 200000-400000, then filter for good .com emails
# Rules:
#   - Only .com domains
#   - Domain name part must be > 2 chars
#   - No digits in domain
#   - No hyphen in domain
#   - No blocked domains or usernames
#   - 1 email per domain max
#   - Max 10000 results

sed -n '200000,400000p' "/Users/naitikvijayvargiya/Desktop/Emailing extracing/output (4).txt" | \
awk -F'[:;|,\t]' '
BEGIN {
  # Blocked domains (partial matches for those without dots, exact for those with dots)
  split("t-online.de,online.de,web.de,u2.com,1.humail.club,chmail.ir,yandex.ru,mail.tmwlsw.com,escobarsrl.com,rambler.ru,xiangyunplay.com,miha33.com,pyrpyr.pl,icn.od.ua,thdby.com,gamerspace.online,gmx.de,gmx.net,mimo.org,microsoft.com,aol.com,aol.de,aol.br,freenet.de,net.de,wctc.net,hive.is,mwt.net,ufba.br,telefornica.net,hawaiiantel.net,cheapnet.it,mclink.it,magenta.de,alakuafrika.com,paragoninnovation.net,dokom.net,piechulska.pl,delarra.com,vera.com.uy,csmena.com,klinikamolicki.pl,pscincorp.com,cruzio.com,leadervet.com,infowayme.com,gazeta.pl,alindatechnologies.com,uniqueradio.org,aatman.in,chancellorinsja.com,mambestudio.com,eggcorndigital.com,cozycottageco.com,jampti.com,heeals.org,cybussolutions.com,oxydom.ma,lamut.tech,amuri.net,posteo.de,exacomaudit.com,drsowjanyaaggarwal.com,cakeart.net,rskdpgcollege.org", blocked_exact, ",")
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

  # Must end with .com
  if (em_lower !~ /\.com$/) next

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

  # Block exact domain matches
  blocked = 0
  for (i in blocked_exact) {
    if (domain == blocked_exact[i]) { blocked = 1; break }
  }
  if (blocked) next

  # Block partial domain matches
  for (i in blocked_partial) {
    if (index(domain, blocked_partial[i]) > 0) { blocked = 1; break }
  }
  if (blocked) next

  # Block usernames
  split(em_lower, uparts, "@")
  localpart = uparts[1]
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
}' > "/Users/naitikvijayvargiya/Desktop/Emailing extracing/good_10k.txt"

result_count=$(wc -l < "/Users/naitikvijayvargiya/Desktop/Emailing extracing/good_10k.txt")
echo "Extracted $result_count good emails to good_10k.txt"
