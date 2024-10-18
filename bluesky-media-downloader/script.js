// ==UserScript==
// @name         Bluesky Media Downloader
// @version      0.1
// @description  Download Bluesky media with a simple click.
// @icon         https://bsky.app/static/favicon-32x32.png
// @author       Mike Lei
// @match        https://bsky.app/*
// @grant        GM_addStyle
// @grant        GM_download
// ==/UserScript==

"use strict";

GM_addStyle(`
button.bsky-dl-btn {
    position: absolute;
    z-index: 1;
    right: 0;
    border: none;
    border-radius: 5px;
    background-color: rgb(0 0 0 / 0.6);
    height: 30px;
    width: 30px;
}

button.bsky-dl-btn:hover {
    background-color: rgb(0 0 0 / 0.8);
}

button.bsky-dl-btn:active {
    background-color: rgb(80 80 80);
}

div.bsky-dl-all-btn {
    flex: 1 1 0;
}

div.bsky-dl-all-btn > svg {
    padding: 5px;
}
`);

const createElement = (tagName, attributes = {}, ...children) => {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    element.append(...children);
    return element;
}

const icon = `<svg viewBox="0 0 512 512" height="16" width="16" tabindex="-1"><path fill="hsl(211, 20%, 95.3%)" d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"></path></svg>`;
const dlAllIcon = `<svg viewBox="0 0 512 512" height="16" width="16" tabindex="-1"><path fill="hsl(211, 20%, 53%)" d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"></path></svg>`;
const $ = (selector, origin = document) => origin.querySelector(selector);
const $$ = (selector, origin = document) => Array.from(origin.querySelectorAll(selector));

const downloadImage = (element, index = 0) => {
    const img = $("img", element.closest("div"));
    const post = $("a[data-tooltip]", element.closest(`div[data-testid^="feedItem"]`));
    const url = img.src.replace("feed_thumbnail", "feed_fullsize");
    const data = post.href.match(/^https:\/\/(?<hostname>.+)\/profile\/(?<uid>[\w\.]+)\/post\/(?<pid>\w+)$/).groups;
    const ext = url.match(/(?<=@)\w+$/)[0];
    GM_download({
        url,
        name: `${data.hostname} @${data.uid} ${data.pid}${index == 0 ? "" : "_0" + index}.${ext}`
    });
}

const addDownloadButton = (element) => {
    const media = $$(`div[data-expoimage="true"]`, element);
    media.forEach((m, i) => {
        const btn = createElement("button", { class: "bsky-dl-btn" });
        btn.innerHTML = icon;
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            downloadImage(e.target, media.length > 1 ? i + 1 : 0)
        });
        m.appendChild(btn);
    });
    if (media.length > 1) {
        const postBtn = $(`div[data-testid="contentHider-post"] + div`, element);
        const dlAllBtn = createElement("div", { class: "bsky-dl-all-btn" });
        dlAllBtn.innerHTML = dlAllIcon;
        dlAllBtn.addEventListener("click", (e) => {
            e.preventDefault();
            media.forEach((m, i) => {
                downloadImage(m, i + 1);
            });
        });
        postBtn.appendChild(dlAllBtn);
    }
}

new MutationObserver((rs, obs) => {
    rs.forEach(r => {
        r.addedNodes.forEach(n => {
            if (n.matches(`div:has(> div > div[data-testid^="feedItem"])`)) {
                addDownloadButton(n);
            }
        });
    });
}).observe($("#root"), { childList: true, subtree: true });
