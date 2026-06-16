const btn = document.getElementById('generate-btn');
const loader = document.getElementById('loader');
const btnText = document.getElementById('btn-text');
const promptOutput = document.getElementById('prompt-output');
const statusEl = document.getElementById('status');
const targetUrlEl = document.getElementById('target-url');

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setLoading(loading) {
  loader.style.display = loading ? 'inline-block' : 'none';
  btnText.textContent = loading ? 'Analyzing...' : 'Generate & Copy Prompt';
  btn.disabled = loading;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tab = await getActiveTab();
  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      targetUrlEl.textContent = url.hostname;
    } catch {
      targetUrlEl.textContent = tab.url.slice(0, 40);
    }
  }
});

btn.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  setLoading(true);
  statusEl.textContent = '';

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
      chrome.tabs.sendMessage(tab.id, { action: 'GENERATE_PROMPT' }, (resp) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(resp);
      });
    });

    if (response?.prompt) {
      promptOutput.value = response.prompt;
      await copyToClipboard(response.prompt);
      statusEl.textContent = '✓ Kopyalandı!';
      btn.classList.add('success');
      btnText.textContent = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('success');
        setLoading(false);
        btnText.textContent = 'Generate & Copy Prompt';
        statusEl.textContent = '';
      }, 2500);
    } else {
      throw new Error('No prompt returned');
    }
  } catch (err) {
    statusEl.textContent = '✗ Error: ' + err.message;
    setLoading(false);
  }
});
