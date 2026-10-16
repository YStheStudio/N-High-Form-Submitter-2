document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    const saveBtn = document.getElementById('saveBtn');
    const status = document.getElementById('status');
    const autoSubmitCheck = document.getElementById('autoSubmitCheck');
    const saveCheckIcon = document.getElementById('saveCheckIcon');
    const charCounter = document.getElementById('charCounter');

    const updateCounter = () => {
        charCounter.textContent = `${nameInput.value.length}文字`;
    };

    nameInput.addEventListener('focus', () => {
        updateCounter();
        charCounter.style.display = 'block';
    });

    nameInput.addEventListener('input', updateCounter);

    nameInput.addEventListener('blur', () => {
        charCounter.style.display = 'none';
    });

    // Load saved settings
    chrome.storage.local.get(['userName', 'autoSubmit'], (result) => {
        if (result.userName) {
            nameInput.value = result.userName;
        }
        if (result.autoSubmit !== undefined) {
            autoSubmitCheck.checked = result.autoSubmit;
        }
    });

    saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        const autoSubmit = autoSubmitCheck.checked;
        chrome.storage.local.set({ userName: name, autoSubmit: autoSubmit }, () => {
            status.style.display = 'block';
            saveCheckIcon.style.display = 'block';
            saveBtn.disabled = true;
            setTimeout(() => { 
                status.style.display = 'none'; 
                saveCheckIcon.style.display = 'none';
                saveBtn.disabled = false;
            }, 2000);
            
            // Optionally, try to autofill active form tab immediately
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes("docs.google.com/forms")) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "autofill" }).catch(() => {
                        // ignore errors if content script not loaded
                    });
                }
            });
        });
    });
});
