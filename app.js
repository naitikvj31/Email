/**
 * Email Extractor — Application Logic
 * Extracts email addresses from email:password formatted text files.
 * Filters: duplicates, blocked domains, digits in domain.
 */

(function () {
  'use strict';

  // ---- Blocked Domains (case-insensitive) ----
  const BLOCKED_DOMAINS = [
    "t-online.de",
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
    "mail",
    "web",
    "yahoo",
    "hotmail",
    "gmail"
  ].map(d => d.toLowerCase());

  /**
   * Check if a domain is blocked.
   * - Entries without a dot (e.g. "mail", "yahoo") → blocks any domain containing that string
   * - Entries with a dot (e.g. "t-online.de") → blocks exact domain match
   */
  function isDomainBlocked(domain) {
    const d = domain.toLowerCase();
    for (const blocked of BLOCKED_DOMAINS) {
      if (blocked.includes('.')) {
        // Exact domain match
        if (d === blocked) return true;
      } else {
        // Partial/contains match
        if (d.includes(blocked)) return true;
      }
    }
    return false;
  }

  /**
   * Check if domain contains any digit (0-9)
   */
  function domainHasDigit(domain) {
    return /\d/.test(domain);
  }

  // ---- DOM Elements ----
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

  // Stats
  const statTotal = document.getElementById('stat-total');
  const statExtracted = document.getElementById('stat-extracted');
  const statSkipped = document.getElementById('stat-skipped');
  const statDuplicates = document.getElementById('stat-duplicates');
  const statBlocked = document.getElementById('stat-blocked');
  const statDigit = document.getElementById('stat-digit');

  // Step indicators
  const step1 = document.getElementById('step-1-indicator');
  const step2 = document.getElementById('step-2-indicator');
  const step3 = document.getElementById('step-3-indicator');
  const stepLine1 = document.getElementById('step-line');
  const stepLine2 = document.getElementById('step-line-2');

  // ---- State ----
  let selectedFile = null;
  let extractedEmails = [];

  // ---- Helpers ----
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
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  // ---- File Handling ----
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

  // Click to upload
  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag & Drop
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

  // Remove file
  btnRemove.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    btnExtract.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    setStep(1);
  });

  // ---- Extraction ----
  btnExtract.addEventListener('click', () => {
    if (!selectedFile) return;

    // Show processing
    fileInfo.classList.add('hidden');
    btnExtract.classList.add('hidden');
    processing.classList.remove('hidden');
    setStep(2);

    const reader = new FileReader();

    reader.onload = function (e) {
      const text = e.target.result;

      // Simulate a brief processing delay for UX
      setTimeout(() => {
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

        // --- Step 1: Remove duplicate lines ---
        const uniqueLines = [];
        const seenLines = new Set();
        let duplicateCount = 0;

        lines.forEach((line) => {
          const normalized = line.trim().toLowerCase();
          if (seenLines.has(normalized)) {
            duplicateCount++;
          } else {
            seenLines.add(normalized);
            uniqueLines.push(line.trim());
          }
        });

        // --- Step 2: Extract emails ---
        const allEmails = [];
        let skipped = 0;

        uniqueLines.forEach((trimmed) => {
          if (!trimmed) return;

          // Try to extract email — supports : ; | , tab as delimiters
          const parts = trimmed.split(/[:;|,\t]/);
          const candidate = parts[0].trim();

          // Basic email validation
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
            allEmails.push(candidate);
          } else {
            // Fallback: look for an email anywhere in the line
            const emailMatch = trimmed.match(/[^\s@:;|,]+@[^\s@:;|,]+\.[^\s@:;|,]+/);
            if (emailMatch) {
              allEmails.push(emailMatch[0]);
            } else {
              skipped++;
            }
          }
        });

        // --- Step 3: Filter blocked domains ---
        let blockedCount = 0;
        const afterBlocked = allEmails.filter((email) => {
          const domain = email.split('@')[1];
          if (domain && isDomainBlocked(domain)) {
            blockedCount++;
            return false;
          }
          return true;
        });

        // --- Step 4: Filter domains containing digits ---
        let digitCount = 0;
        extractedEmails = afterBlocked.filter((email) => {
          const domain = email.split('@')[1];
          if (domain && domainHasDigit(domain)) {
            digitCount++;
            return false;
          }
          return true;
        });

        // Hide processing, show results
        processing.classList.add('hidden');
        results.classList.remove('hidden');
        setStep(3);

        // Animate stats
        animateCounter(statTotal, lines.length);
        animateCounter(statDuplicates, duplicateCount);
        animateCounter(statBlocked, blockedCount);
        animateCounter(statDigit, digitCount);
        animateCounter(statSkipped, skipped);
        animateCounter(statExtracted, extractedEmails.length);

        // Preview
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
      }, 800);
    };

    reader.readAsText(selectedFile);
  });

  // ---- Download ----
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

    // Brief visual feedback on download button
    btnDownload.style.transform = 'scale(0.97)';
    setTimeout(() => {
      btnDownload.style.transform = '';
    }, 150);
  });

  // ---- Reset ----
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

  // ---- Utility ----
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();

