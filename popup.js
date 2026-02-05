// Popup script
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

function showStatus(message, type = 'info') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = type;
  
  if (type !== 'info') {
    setTimeout(() => {
      status.textContent = '';
      status.className = '';
    }, 3000);
  }
}

function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function getCharacterIdFromTab(tab) {
  if (!tab || !tab.url) return null;
  const match = tab.url.match(/\/characters\/(\d+)/);
  return match ? match[1] : null;
}

// Check if we're on a character page
browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab.url || !tab.url.includes('dndbeyond.com/characters/')) {
    showStatus('⚠️ Please navigate to a D&D Beyond character page', 'info');
  }
});

// Copy Cobalt Cookie
document.getElementById('copy-cobalt-btn').addEventListener('click', () => {
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const characterId = getCharacterIdFromTab(tab);
    
    if (!characterId) {
      showStatus('❌ Not on a character page', 'error');
      return;
    }
    
    browserAPI.runtime.sendMessage({ action: "getCobaltCookie" }, (response) => {
      if (response.success) {
        const exportData = {
          cobaltCookie: response.cookie,
          characterUrl: tab.url,
          characterId: characterId,
          timestamp: new Date().toISOString()
        };
        copyToClipboard(JSON.stringify(exportData, null, 2));
        showStatus('✓ Cookie copied to clipboard!', 'success');
      } else {
        showStatus(`✗ ${response.error}`, 'error');
      }
    });
  });
});

// Copy Character Data
document.getElementById('copy-character-btn').addEventListener('click', () => {
  browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const characterId = getCharacterIdFromTab(tab);
    
    if (!characterId) {
      showStatus('❌ Not on a character page', 'error');
      return;
    }
    
    showStatus('⏳ Fetching character data...', 'info');
    
    browserAPI.runtime.sendMessage({ action: "getCobaltCookie" }, (cookieResponse) => {
      if (!cookieResponse.success) {
        showStatus(`✗ ${cookieResponse.error}`, 'error');
        return;
      }
      
      browserAPI.runtime.sendMessage({
        action: "fetchCharacterData",
        characterId: characterId,
        cobaltCookie: cookieResponse.cookie
      }, (dataResponse) => {
        if (dataResponse.success) {
          const exportData = {
            cobaltCookie: cookieResponse.cookie,
            characterUrl: tab.url,
            characterId: characterId,
            characterData: dataResponse.data,
            timestamp: new Date().toISOString()
          };
          copyToClipboard(JSON.stringify(exportData, null, 2));
          showStatus('✓ Character data copied!', 'success');
        } else {
          showStatus(`✗ ${dataResponse.error}`, 'error');
        }
      });
    });
  });
});