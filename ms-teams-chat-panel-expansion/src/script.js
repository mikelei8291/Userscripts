// ==UserScript==
// @name         MS Teams in Meeting Chat Panel Expansion
// @version      0.3
// @icon         https://statics.teams.cdn.office.net/hashedassets/favicon/prod/favicon-9e2b8f1.ico
// @author       Mike Lei
// @match        https://teams.microsoft.com/_
// @grant        none
// ==/UserScript==

let style = document.createElement("style");
style.type = "text/css";
style.innerText = ".ts-calling-screen .ts-add-message .ts-new-message { max-width: 100%; } .ts-right-rail { width: 100%; }";
document.head.appendChild(style);
let rule = document.createTextNode(".app-bar-offset .ts-calling-screen .calling-controls { width: 50%; } .ts-meeting-panel-components { flex-basis: 50%; }");
let activate = () => {
    let chatButton = document.getElementById("chat-button");
    chatButton.addEventListener("click", (event) => {
        // console.log(event);
        event.preventDefault();
        if (style.contains(rule)) {
            if (event.ctrlKey) {
                event.stopPropagation();
                rule.remove(); // shrink
            } else {
                rule.remove();
            }
        } else if (event.ctrlKey) {
            if (chatButton.classList.contains("active")) {
                event.stopPropagation();
            }
            style.appendChild(rule); // expand
        }
    }, true);
    document.getElementById("hangup-button").addEventListener("click", () => rule.remove());
}

window.addEventListener("hashchange", () => {
    if (location.hash.startsWith("#/calling/")) {
        waitForKeyElements("#chat-button", activate);
    }
});

function waitForKeyElements(e,t,a,n){var o,r;(o=void 0===n?$(e):$(n).contents().find(e))&&o.length>0?(r=!0,o.each(function(){var e=$(this);e.data("alreadyFound")||!1||(t(e)?r=!1:e.data("alreadyFound",!0))})):r=!1;var l=waitForKeyElements.controlObj||{},i=e.replace(/[^\w]/g,"_"),c=l[i];r&&a&&c?(clearInterval(c),delete l[i]):c||(c=setInterval(function(){waitForKeyElements(e,t,a,n)},300),l[i]=c),waitForKeyElements.controlObj=l}

// function waitForKeyElements(
//    selectorTxt, // Required: The jQuery selector string that specifies the desired element(s).
//    actionFunction, // Required: The code to run when elements are found. It is passed a jNode to the matched element.
//    bWaitOnce, // Optional: If false, will continue to scan for new elements even after the first match is found.
//    iframeSelector // Optional: If set, identifies the iframe to search.
// )
