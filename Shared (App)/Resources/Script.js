function show(platform, enabled, useSettingsInsteadOfPreferences) {
    document.body.classList.add(`platform-${platform}`);

    if (useSettingsInsteadOfPreferences) {
        document.getElementsByClassName('platform-mac state-on')[0].innerText = "N High Form Submitter 2の拡張機能が有効になっています。Safariの拡張機能の設定でオフにすることができます。";
        document.getElementsByClassName('platform-mac state-off')[0].innerText = "N High Form Submitter 2の拡張機能が無効になっています。Safariの拡張機能の設定でオンにすることができます。";
        document.getElementsByClassName('platform-mac state-unknown')[0].innerText = "Safariの設定でN High Form Submitter 2の拡張機能をオンにすることができます。";
        document.getElementsByClassName('platform-mac open-preferences')[0].innerText = "設定を開いて終了";
    }

    if (typeof enabled === "boolean") {
        document.body.classList.toggle(`state-on`, enabled);
        document.body.classList.toggle(`state-off`, !enabled);
    } else {
        document.body.classList.remove(`state-on`);
        document.body.classList.remove(`state-off`);
    }
}

function openPreferences() {
    webkit.messageHandlers.controller.postMessage("open-preferences");
}

document.querySelector("button.open-preferences").addEventListener("click", openPreferences);
