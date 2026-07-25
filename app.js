(function () {
  'use strict';

  const BLOCKED_DOMAINS = [
    "t-online.de",
    "online.de",
    "web.de",
    "u2.com",
    "1.humail.club",
    "chmail.ir",
    "yandex.ru",
    "mail.tmwlsw.com",
    "escobarsrl.com",
    "rambler.ru",
    "xiangyunplay.com",
    "miha33.com",
    "pyrpyr.pl",
    "icn.od.ua",
    "thdby.com",
    "gamerspace.online",
    "mail",
    "web",
    "yahoo",
    "hotmail",
    "gmail",
    "garmerspace",
    "vnetwork",
    "sina",
    "freenet.de",
    "net.de",
    "wctc.net",
    "sion",
    "hive.is",
    "mwt.net"
  ].map(d => d.toLowerCase());

  const BLOCKED_TLDS = [".cc", ".ru", ".jp", ".pl", ".fr"];

  function isDomainBlocked(domain) {
    const d = domain.toLowerCase();
    const dotCount = (d.match(/\./g) || []).length;
    if (dotCount >= 2) return true;
    if (d.includes('-')) return true;
    for (const tld of BLOCKED_TLDS) {
      if (d.endsWith(tld)) return true;
    }
    for (const blocked of BLOCKED_DOMAINS) {
      if (blocked.includes('.')) {
        if (d === blocked) return true;
      } else {
        if (d.includes(blocked)) return true;
      }
    }
    return false;
  }

  function domainHasDigit(domain) {
    return /\d/.test(domain);
  }

  const BLOCKED_USERNAMES = [
    "admin", "contact", "user", "hello", "help",
    "candidate", "support", "shop", "validate", "verify",
    "office", "mail"
  ];

  function isUsernameBlocked(email) {
    const localPart = email.split('@')[0].toLowerCase();
    return BLOCKED_USERNAMES.includes(localPart);
  }

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const uploadArea = document.getElementById('upload-area');
  const fileInfo = document.getElementById('file-info');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');
  const btnRemove = document.getElementById('btn-remove');
  const btnExtract = document.getElementById('btn-extract');
  const processing = document.getElementById('processing');
  const results = document.getElementById('results');
  const btnDownload = document.getElementById('btn-download');
  const btnReset = document.getElementById('btn-reset');
  const previewList = document.getElementById('preview-list');
  const previewCount = document.getElementById('preview-count');

  const statTotal = document.getElementById('stat-total');
  const statExtracted = document.getElementById('stat-extracted');
  const statSkipped = document.getElementById('stat-skipped');
  const statDuplicates = document.getElementById('stat-duplicates');
  const statBlocked = document.getElementById('stat-blocked');
  const statDigit = document.getElementById('stat-digit');

  const step1 = document.getElementById('step-1-indicator');
  const step2 = document.getElementById('step-2-indicator');
  const step3 = document.getElementById('step-3-indicator');
  const stepLine1 = document.getElementById('step-line');
  const stepLine2 = document.getElementById('step-line-2');


  let selectedFile = null;
  let extractedEmails = [];

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function setStep(stepNum) {
    [step1, step2, step3].forEach((s, i) => {
      s.classList.remove('active', 'completed');
      if (i + 1 < stepNum) s.classList.add('completed');
      else if (i + 1 === stepNum) s.classList.add('active');
    });

    stepLine1.classList.toggle('active', stepNum >= 2);
    stepLine2.classList.toggle('active', stepNum >= 3);
  }

  function animateCounter(el, target, duration = 600) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  function handleFile(file) {
    if (!file) return;

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    uploadArea.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    btnExtract.classList.remove('hidden');
    setStep(1);
  }

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });


  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  btnRemove.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    btnExtract.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    setStep(1);
  });

  btnExtract.addEventListener('click', () => {
    if (!selectedFile) return;

    fileInfo.classList.add('hidden');
    btnExtract.classList.add('hidden');
    processing.classList.remove('hidden');
    setStep(2);

    const progressBar = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressLines = document.getElementById('progress-lines');
    const processingText = document.getElementById('processing-text');
    const liveEmailCount = document.getElementById('live-email-count');
    const liveFilteredCount = document.getElementById('live-filtered-count');

    progressBar.style.width = '0%';
    progressPercent.textContent = '0%';
    progressLines.textContent = '0 lines';
    liveEmailCount.textContent = '0';
    liveFilteredCount.textContent = '0';
    processingText.textContent = 'Reading file...';

    const reader = new FileReader();

    reader.onload = function (e) {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
      const totalLines = lines.length;

      processingText.textContent = 'Extracting & filtering...';

      const uniqueLines = [];
      const seenLines = new Set();
      let duplicateCount = 0;
      let skipped = 0;
      let blockedCount = 0;
      let digitCount = 0;
      extractedEmails = [];

      const CHUNK_SIZE = 5000;
      let currentIndex = 0;

      function processChunk() {
        const end = Math.min(currentIndex + CHUNK_SIZE, totalLines);

        for (let i = currentIndex; i < end; i++) {
          const trimmed = lines[i].trim();
          if (!trimmed) continue;

          const normalized = trimmed.toLowerCase();
          if (seenLines.has(normalized)) {
            duplicateCount++;
            continue;
          }
          seenLines.add(normalized);

          const parts = trimmed.split(/[:;|,\t]/);
          const candidate = parts[0].trim();
          let email = null;

          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
            email = candidate;
          } else {
            const emailMatch = trimmed.match(/[^\s@:;|,]+@[^\s@:;|,]+\.[^\s@:;|,]+/);
            if (emailMatch) {
              email = emailMatch[0];
            } else {
              skipped++;
              continue;
            }
          }

          const domain = email.split('@')[1];
          if (domain && isDomainBlocked(domain)) {
            blockedCount++;
            continue;
          }
          if (domain && domainHasDigit(domain)) {
            digitCount++;
            continue;
          }
          if (isUsernameBlocked(email)) {
            blockedCount++;
            continue;
          }

          extractedEmails.push(email);
        }

        currentIndex = end;

        const pct = Math.round((currentIndex / totalLines) * 100);
        progressBar.style.width = pct + '%';
        progressPercent.textContent = pct + '%';
        progressLines.textContent = currentIndex.toLocaleString() + ' / ' + totalLines.toLocaleString() + ' lines';
        liveEmailCount.textContent = extractedEmails.length.toLocaleString();
        liveFilteredCount.textContent = (duplicateCount + blockedCount + digitCount + skipped).toLocaleString();

        if (currentIndex < totalLines) {
          setTimeout(processChunk, 0);
        } else {
          processing.classList.add('hidden');
          results.classList.remove('hidden');
          setStep(3);

          animateCounter(statTotal, totalLines);
          animateCounter(statDuplicates, duplicateCount);
          animateCounter(statBlocked, blockedCount);
          animateCounter(statDigit, digitCount);
          animateCounter(statSkipped, skipped);
          animateCounter(statExtracted, extractedEmails.length);

          const previewEmails = extractedEmails.slice(0, 10);
          const remaining = extractedEmails.length - previewEmails.length;
          previewCount.textContent =
            remaining > 0
              ? `First ${previewEmails.length} of ${extractedEmails.length}`
              : `${extractedEmails.length} email${extractedEmails.length !== 1 ? 's' : ''}`;

          previewList.innerHTML = '';
          previewEmails.forEach((email, i) => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            item.innerHTML = `
              <span class="preview-item-number">${i + 1}.</span>
              <span class="preview-item-email">${escapeHtml(email)}</span>
            `;
            previewList.appendChild(item);
          });

          if (remaining > 0) {
            const moreItem = document.createElement('div');
            moreItem.className = 'preview-item';
            moreItem.style.justifyContent = 'center';
            moreItem.style.color = 'var(--text-muted)';
            moreItem.style.fontFamily = 'inherit';
            moreItem.textContent = `… and ${remaining} more`;
            previewList.appendChild(moreItem);
          }
        }
      }

      processChunk();
    };

    reader.readAsText(selectedFile);
  });


  btnDownload.addEventListener('click', () => {
    if (extractedEmails.length === 0) return;

    const content = extractedEmails.join('\n') + '\n';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    btnDownload.style.transform = 'scale(0.97)';
    setTimeout(() => {
      btnDownload.style.transform = '';
    }, 150);
  });

  btnReset.addEventListener('click', () => {
    selectedFile = null;
    extractedEmails = [];
    fileInput.value = '';

    results.classList.add('hidden');
    processing.classList.add('hidden');
    fileInfo.classList.add('hidden');
    btnExtract.classList.add('hidden');
    uploadArea.classList.remove('hidden');

    previewList.innerHTML = '';
    setStep(1);
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();

