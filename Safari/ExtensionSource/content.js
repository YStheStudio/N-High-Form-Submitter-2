let hasAutofilledEmail = false;
let hasAutofilledName = false;

function hasKadokawaDwangoTextOutsideForm() {
    if (!document.body) return false;

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                // Exclude any node within a <form> element
                if (parent.closest('form')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Exclude extension's own status box
                if (parent.closest('#n-high-form-status')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Exclude script, style, noscript tags
                const tag = parent.tagName.toLowerCase();
                if (tag === 'script' || tag === 'style' || tag === 'noscript') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let textWithSpaces = "";
    let textRaw = "";
    while (walker.nextNode()) {
        textWithSpaces += " " + walker.currentNode.nodeValue;
        textRaw += walker.currentNode.nodeValue;
    }

    const pattern = /学校法人[\s\u00A0　]*角川ドワンゴ学園/;
    return pattern.test(textWithSpaces) || pattern.test(textRaw);
}

function autofill(force = false) {
    const titleHeading = document.querySelector('div[role="heading"][aria-level="1"]') || document.querySelector('.freebirdFormviewerViewHeaderTitle');
    const titleText = titleHeading ? titleHeading.textContent : document.title;
    if (!titleText.includes("出席フォーム")) {
        return;
    }

    if (!hasKadokawaDwangoTextOutsideForm()) {
        return;
    }

    chrome.storage.local.get(['userName', 'autoSubmit'], (result) => {
        const userName = result.userName;
        const autoSubmit = result.autoSubmit || false;

        // Show Status Box above the email checkbox
        let emailContainer = null;
        const allCheckboxes = document.querySelectorAll('div[role="checkbox"]');
        for (const cb of allCheckboxes) {
            const label = cb.getAttribute('aria-label') || "";
            if (label.includes('メール') || label.includes('email')) {
                emailContainer = cb.closest('div[role="listitem"]') || cb.closest('.geS5n') || cb.parentElement.parentElement.parentElement;
                break;
            }
        }

        if (!emailContainer) {
            emailContainer = document.querySelector('div[role="listitem"]');
        }

        let accentColor = '#1a73e8';
        let foundColor = false;

        // 1. Try to grab from top border of form title
        const titleHeading = document.querySelector('div[role="heading"][aria-level="1"]') || document.querySelector('.freebirdFormviewerViewHeaderTitle');
        if (titleHeading) {
            let el = titleHeading;
            while (el && el !== document.body && !foundColor) {
                let sibling = el.previousElementSibling;
                while (sibling && !foundColor) {
                    const bg = window.getComputedStyle(sibling).backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
                        if (sibling.textContent.trim() === '') {
                            accentColor = bg;
                            foundColor = true;
                        }
                    }
                    sibling = sibling.previousElementSibling;
                }
                el = el.parentElement;
            }
        }

        // 2. Fallback to submit button
        if (!foundColor) {
            const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => !b.closest('#n-high-form-status'));
            const submitBtn = btns.find(btn => btn.textContent.includes("送信") || btn.textContent.includes("Submit") || btn.textContent.includes("次へ") || btn.textContent.includes("Next"));
            if (submitBtn) {
                let el = submitBtn;
                while (el) {
                    const bg = window.getComputedStyle(el).backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                        accentColor = bg;
                        break;
                    }
                    el = el.firstElementChild;
                }
            }
        }

        let statusBox = document.getElementById('n-high-form-status');
        if (emailContainer && !statusBox) {
            statusBox = document.createElement('div');
            statusBox.id = 'n-high-form-status';
            statusBox.style.padding = '16px 24px';
            statusBox.style.marginBottom = '12px';
            statusBox.style.borderRadius = '6px 8px 8px 6px';
            statusBox.style.fontFamily = 'Roboto, Arial, sans-serif';
            statusBox.style.fontSize = '14px';
            statusBox.style.backgroundColor = '#fff';
            statusBox.style.boxShadow = 'inset 0 1px 0 0 #dadce0, inset 0 -1px 0 0 #dadce0, inset -1px 0 0 0 #dadce0';

            statusBox.style.display = 'flex';
            statusBox.style.justifyContent = 'space-between';
            statusBox.style.alignItems = 'center';
            statusBox.style.flexWrap = 'wrap';
            statusBox.style.gap = '16px';

            if (emailContainer.parentNode) {
                emailContainer.parentNode.insertBefore(statusBox, emailContainer);
            }
        }

        if (statusBox) {
            const currentName = statusBox.dataset.userName || "NONE";
            const currentAccent = statusBox.dataset.accentColor || "";

            const btns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => !b.closest('#n-high-form-status'));
            const originalSubmit = btns.find(btn => btn.textContent.includes("送信") || btn.textContent.includes("Submit") || btn.textContent.includes("次へ") || btn.textContent.includes("Next"));
            const shouldHaveSubmitBtn = (userName && originalSubmit) ? "true" : "false";
            const currentHasSubmitBtn = statusBox.dataset.hasSubmitBtn || "false";

            if (currentName !== (userName || "NONE") || currentAccent !== accentColor || currentHasSubmitBtn !== shouldHaveSubmitBtn) {
                statusBox.dataset.userName = userName || "NONE";
                statusBox.dataset.accentColor = accentColor;
                statusBox.dataset.hasSubmitBtn = shouldHaveSubmitBtn;

                statusBox.innerHTML = '';

                const textContainer = document.createElement('div');
                textContainer.style.flex = '1';
                textContainer.style.minWidth = '200px';

                if (userName) {
                    statusBox.style.borderLeft = `10px solid ${accentColor}`;
                    textContainer.innerHTML = `<strong>N High Form Submitter 2</strong>: 「${userName}」として自動入力しました。<br>ReturnまたはEnterで送信できます。`;
                } else {
                    statusBox.style.borderLeft = '10px solid #db372d';
                    textContainer.style.display = 'flex';
                    textContainer.style.alignItems = 'center';
                    textContainer.style.gap = '12px';
                    const warningSvg = `<svg width="42" height="42" viewBox="0 0 126 126" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;"><path id="Shape" fill="#db372d" fill-rule="evenodd" stroke="none" d="M 63 23 L 19 99 L 107 99 L 63 23 Z M 67 87 L 67 79 L 59 79 L 59 87 L 67 87 Z M 67 55 L 67 75 L 59 75 L 59 55 L 67 55 Z"/></svg>`;
                    textContainer.innerHTML = `
                        ${warningSvg}
                        <div>
                            <strong>N High Form Submitter 2</strong>: 入力する名前が設定されていません。<br>拡張機能のアイコンをクリックして名前を設定してください。
                        </div>
                    `;
                }
                statusBox.appendChild(textContainer);

                if (userName && originalSubmit) {
                    const clonedBtn = originalSubmit.cloneNode(true);
                    clonedBtn.removeAttribute('jsaction');
                    clonedBtn.removeAttribute('jscontroller');
                    clonedBtn.style.margin = '0';
                    clonedBtn.style.cursor = 'pointer';

                    const svgs = clonedBtn.querySelectorAll('svg');
                    svgs.forEach(svg => {
                        if (svg.getAttribute('viewBox') === '0 0 216 255') {
                            svg.remove();
                        }
                    });

                    clonedBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const texts = clonedBtn.querySelectorAll('span');
                        texts.forEach(span => {
                            if (span.textContent.trim().length > 0 && !span.querySelector('svg')) {
                                span.style.transition = 'color 0.2s, opacity 0.2s';
                                span.style.color = '#000';
                                span.style.opacity = '0.5';
                            }
                        });
                        clonedBtn.style.pointerEvents = 'none';

                        const currentBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => !b.closest('#n-high-form-status'));
                        const currentSubmit = currentBtns.find(btn => btn.textContent.includes("送信") || btn.textContent.includes("Submit") || btn.textContent.includes("次へ") || btn.textContent.includes("Next"));
                        if (currentSubmit) {
                            currentSubmit.click();
                        }
                    });

                    statusBox.appendChild(clonedBtn);
                }
            }
        }

        if (!userName) return; // Don't autofill fields if no name is set

        if (!hasAutofilledEmail || force) {
            let filledEmail = false;
            // 1. Checkbox to record the email address
            // Google Forms typically uses custom div elements with role="checkbox"
            const checkboxes = document.querySelectorAll('div[role="checkbox"]');
            checkboxes.forEach(cb => {
                const label = cb.getAttribute('aria-label') || "";
                // Look for email related labels
                if (label.includes('メール') || label.includes('email')) {
                    if (cb.getAttribute('aria-checked') === 'false') {
                        cb.click();
                    }
                    filledEmail = true;
                }
            });

            // Also check standard input checkboxes if they exist in forms
            const standardCheckboxes = document.querySelectorAll('input[type="checkbox"]');
            standardCheckboxes.forEach(cb => {
                const parent = cb.closest('div[role="listitem"]') || cb.parentElement;
                if (parent && (parent.textContent.includes('メール') || parent.textContent.includes('email'))) {
                    if (!cb.checked) {
                        cb.click();
                    }
                    filledEmail = true;
                }
            });

            if (filledEmail) hasAutofilledEmail = true;
        }

        if (!hasAutofilledName || force) {
            let filledName = false;
            // 2. Text field with title starting from "氏名（例：N高S太郎）"
            // Find all question containers
            const listItems = document.querySelectorAll('div[role="listitem"]');
            listItems.forEach(item => {
                const text = item.textContent;
                if (text.includes("氏名（例：N高S太郎）") || text.includes("氏名")) {
                    const input = item.querySelector('input[type="text"]');
                    if (input) {
                        if (input.value !== userName) {
                            input.value = userName;
                            // Google Forms requires native events to recognize the input change
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            input.setAttribute('data-initial-value', userName);
                        }
                        filledName = true;
                    }
                }
            });

            if (filledName) hasAutofilledName = true;
        }

        setupSubmitWithReturn();

        if (autoSubmit && !window.hasAutoSubmitted) {
            const currentBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => !b.closest('#n-high-form-status'));
            const currentSubmit = currentBtns.find(btn => btn.textContent.includes("送信") || btn.textContent.includes("Submit") || btn.textContent.includes("次へ") || btn.textContent.includes("Next"));

            if (currentSubmit) {
                window.hasAutoSubmitted = true;

                const statusBox = document.getElementById('n-high-form-status');
                if (statusBox) {
                    const clonedBtn = statusBox.querySelector('div[role="button"]');
                    if (clonedBtn) {
                        const texts = clonedBtn.querySelectorAll('span');
                        texts.forEach(span => {
                            if (span.textContent.trim().length > 0 && !span.querySelector('svg')) {
                                span.style.transition = 'color 0.2s, opacity 0.2s';
                                span.style.color = '#000';
                                span.style.opacity = '0.5';
                            }
                        });
                        clonedBtn.style.pointerEvents = 'none';
                    }
                }

                setTimeout(() => {
                    currentSubmit.click();
                }, 500);
            }
        }
    });
}

function observeDOM() {
    // Debounce the mutation observer slightly to avoid freezing the browser
    let timeout;
    const observer = new MutationObserver((mutations) => {
        clearTimeout(timeout);
        timeout = setTimeout(autofill, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

window.addEventListener('load', () => {
    // Run once initially
    setTimeout(autofill, 500);
    setTimeout(autofill, 1500);

    // And observe for changes (e.g. if the form loads dynamically or has multiple pages)
    observeDOM();
});

// Run when triggered from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "autofill") {
        autofill(true);
    }
});

function setupSubmitWithReturn() {
    const buttons = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => !b.closest('#n-high-form-status'));
    let submitButton = buttons.find(btn => btn.textContent.includes("送信") || btn.textContent.includes("Submit"));

    if (submitButton && !submitButton.dataset.returnIconAdded) {
        const spans = submitButton.querySelectorAll('span');
        let textSpan = null;
        for (const span of spans) {
            if (span.textContent.includes("送信") || span.textContent.includes("Submit")) {
                textSpan = span;
                break;
            }
        }

        const returnSvg = `<svg width="1em" height="1em" viewBox="0 0 216 255" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; margin-left: 24px; margin-bottom: 2px;">
    <g id="Group">
        <path id="path1" fill="currentColor" stroke="none" d="M 12.0947 181.085999 C 12.0947 186.891006 16.812401 191.285004 22.6175 191.574005 L 59.213699 193.255997 L 179.231995 193.255997 C 204.841995 193.255997 215.929993 181.843994 215.929993 156.357697 L 215.929993 98.332306 C 215.929993 72.721497 204.841995 61.634003 179.231995 61.634003 L 125.414001 61.634003 C 118.179001 61.634003 113.017998 67.092957 113.017998 73.803497 C 113.017998 80.513992 118.179001 85.9729 125.414001 85.9729 L 178.423996 85.9729 C 187.936996 85.9729 191.897003 89.999298 191.897003 99.512405 L 191.897003 155.20871 C 191.897003 164.891006 187.936996 168.947998 178.423996 168.947998 L 59.213699 168.947998 L 22.6175 170.563995 C 16.812401 170.852005 12.0947 175.246002 12.0947 181.085999 Z M 0 181.085999 C 0 184.362 1.34921 187.791992 3.76815 190.113998 L 58.9231 244.505005 C 61.297501 246.910004 64.6129 248.26001 67.626297 248.26001 C 74.825104 248.26001 79.547401 243.31601 79.547401 236.529007 C 79.547401 232.841003 78.047401 230.210007 75.868301 227.994995 L 53.018002 205.770996 L 28.462099 185.222992 L 28.462099 176.915009 L 53.018002 156.433304 L 75.868301 134.240005 C 78.047401 132.025406 79.547401 129.326996 79.547401 125.638901 C 79.547401 118.919403 74.825104 113.908707 67.626297 113.908707 C 64.6129 113.908707 61.297501 115.324493 58.9231 117.729996 L 3.76815 172.059006 C 1.34921 174.411011 0 177.774994 0 181.085999 Z"/>
    </g>
</svg>`;

        if (textSpan) {
            textSpan.insertAdjacentHTML('beforeend', returnSvg);
        } else {
            submitButton.insertAdjacentHTML('beforeend', returnSvg);
        }
        submitButton.dataset.returnIconAdded = "true";

        if (!window.returnListenerAdded) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();

                    const statusBox = document.getElementById('n-high-form-status');
                    if (statusBox) {
                        const clonedBtn = statusBox.querySelector('div[role="button"]');
                        if (clonedBtn) {
                            const texts = clonedBtn.querySelectorAll('span');
                            texts.forEach(span => {
                                if (span.textContent.trim().length > 0 && !span.querySelector('svg')) {
                                    span.style.transition = 'color 0.2s, opacity 0.2s';
                                    span.style.color = '#000';
                                    span.style.opacity = '0.5';
                                }
                            });
                            clonedBtn.style.pointerEvents = 'none';
                        }
                    }

                    // Refind button to ensure it hasn't been detached
                    const currentBtns = Array.from(document.querySelectorAll('div[role="button"]')).filter(b => !b.closest('#n-high-form-status'));
                    const currentSubmit = currentBtns.find(btn => btn.dataset.returnIconAdded === "true");
                    if (currentSubmit) {
                        currentSubmit.click();
                    }
                }
            });
            window.returnListenerAdded = true;
        }
    }
}
