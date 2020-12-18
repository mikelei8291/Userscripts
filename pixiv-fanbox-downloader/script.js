// ==UserScript==
// @name         Pixiv Fanbox Downloader
// @version      0.9.6
// @description  Download Pixiv Fanbox images and files.
// @icon         https://www.fanbox.cc/favicon.ico
// @author       Mike Lei
// @match        https://*.fanbox.cc/posts/*
// @match        https://www.fanbox.cc/@*/posts/*
// @require      https://code.jquery.com/jquery-3.5.1.slim.min.js#sha256=4+XzXVhsDmqanXGHaHvgh1gMQKX40OUvDEBTu8JcmNs=
// @resource     style https://raw.githubusercontent.com/mikelei8291/Userscripts/master/pixiv-fanbox-downloader/style.css#sha384=fEgezLordf4KO79iWS488CrPn/bjHhA0rvvGxNex+lZDhSBIoBTe9lqUPTwcbSmy
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_getResourceURL
// @grant        GM_download
// ==/UserScript==

"use strict";

/**
 * Filename formats
 *
 * Templates
 * {downloadDir}: (only works in Chrome) Download to a specific directory in the default download directory
 * {userDir}: (only works in Chrome) Download files that have the same author to a single directory
 * {basename}: Universal filename format
 *
 * Tokens
 * {username}: The name of the author
 * {userId}: The fanbox ID of the author, without the "@"
 * {pixivId}: The pixiv ID of the author
 * {postId}: The ID of the post
 * {index}: The index number of the file, starting from 1
 * {filename}: The original filename of a downloadable file
 * {|{formatName}}: Conditional format, returns the value before the vertical bar if the value of {formatName} doesn't exist,
 *                  otherwise returns the value of {formatName} with the specified format
 *                  e.g. {no value| ({formatName})} returns "no value" if the value of {formatName} doesn't exist, or returns
 *                  " (formatValue)" if the value of {formatName} is "formatValue"
 */

const tokenRegex = /{(?<default>[^{}]*?)(?:\|(?<format>.*?{(?<token>.+?)}.*?)|)}/g;
const isChrome = !!window.chrome;
const defaultConfig = {
    downloadDir: "",
    userDir: "{username} ({pixivId})",
    basename: "fanbox {userId} {postId}{|_{index}}{|_{filename}}",
    subDirThreshold: 10
};

for (const key in defaultConfig) {
    if (!GM_getValue(key)) {
        GM_setValue(key, defaultConfig[key]);
        this[key] = defaultConfig[key];
    } else {
        this[key] = GM_getValue(key);
    }
}

let style = document.createElement("link");
style.rel = "stylesheet";
style.type = "text/css";
style.href = GM_getResourceURL("style");
document.head.appendChild(style);

const format = (template, info) => {
    Array.from(template.matchAll(tokenRegex)).forEach(match => {
        let groups = match.groups;
        if (groups.format) {
            if (!!info[groups.token]) {
                template = template.replace(match[0], groups.format.replace(`{${groups.token}}`, info[groups.token]));
            } else {
                template = template.replace(match[0], groups.default);
            }
        } else {
            if (!!info[groups.default]) {
                template = template.replace(match[0], info[groups.default]);
            } else {
                template = template.replace(match[0], "");
            }
        }
    });
    return template;
}

const formatFilename = (info, withDir = false) => {
    let filename = format(basename, info);
    if (withDir && isChrome) {
        filename = [downloadDir, format(userDir, info), info.subDir, filename].filter(path => !!path).join("/");
    }
    return filename;
}

const addDownloadButton = () => {
    // Create <button> element
    let btn = document.createElement("button");
    let text = document.createElement("span");
    let progress = document.createElement("div");
    btn.id = "fanbox-dl-btn";
    text.innerText = "下载文件";
    progress.className = "btn-progress";
    progress.dataset.status = text.innerText;
    btn.appendChild(text);
    btn.appendChild(progress);
    // Setting anchors
    let article = document.querySelector("article");
    let title = article.querySelector("h1");
    title.appendChild(btn);
    const copyContent = () => {
        let content = `${location.href}\n\n${title.firstChild.data}\n${Array.from(title.nextElementSibling.children).map(e => e.innerText).join("")}`;
        // let articleText = Array.from(article.querySelectorAll("*[data-text=true]")).map(e => e.innerText).reduce((e1, e2) => {
        //     if (e2 === "") {
        //         if (e1.endsWith("\n")) {
        //             return e1;
        //         } else {
        //             return e1 + "\n";
        //         }
        //     } else {
        //         return e1 + "\n" + e2;
        //     }
        // }, "");
        let articleText = article.children[article.childElementCount - 1].innerText.replaceAll(/\n{2,}/g, "\n\n");
        let tags = Array.from(document.querySelectorAll("article ~ div[class]:first-of-type a")).map(e => "#" + e.innerText).join(" ");
        content += articleText !== "" ? "\n\n" + articleText : "";
        content += tags !== "" ? "\n\n" + tags : "";
        navigator.clipboard.writeText(content);
    }
    title.addEventListener("click", copyContent);
    const download = () => {
        progress.style.width = 0;
        btn.removeAttribute("class");
        let info = {
            username: document.querySelectorAll("h1 a")[1].innerText,
            userId: document.querySelector("link[rel='canonical']").href.split(/\/\/|\./)[1],
            pixivId: document.querySelector("div[src]").getAttribute("src").match(/(?<=creator\/)\d+/)[0],
            postId: location.pathname.split("/").pop()
        };
        let formattedBasename = formatFilename(info);
        let files = Array.from(article.querySelectorAll("a img, a[download]")).map(node => {
            if (node.nodeName == "IMG") {
                return { url: node.parentNode.parentNode.href };
            } else if (node.nodeName == "A") {
                return {
                    name: node.download,
                    url: node.href
                };
            }
        });
        if (files.length == 0) {
            if (article.querySelectorAll("a[href$='/plans']").length == 1) {
                text.innerText = "需要赞助";
            } else {
                text.innerText = "无文件";
            }
            navigator.clipboard.writeText(formattedBasename);
        } else {
            text.innerText = "下载中";
            progress.dataset.status = text.innerText;
            if (files.length > 1) {
                if (files.length > subDirThreshold) {
                    info.subDir = formattedBasename;
                }
                let padLength = files.length.toString().length;
                padLength = padLength < 2 ? 2 : padLength;
                files.map((file, index) => {
                    info.index = String(index + 1).padStart(padLength, "0");
                    info.filename = file.name;
                    file.name = `${formatFilename(info, true)}.${file.url.split(".").pop()}`;
                    return file;
                });
            } else if (files.length == 1) {
                info.filename = files[0].name;
                files[0].name = `${formatFilename(info, true)}.${files[0].url.split(".").pop()}`;
            }
            let step = 1 / files.length * 100;
            files.forEach((file, index) => {
                console.log(`${file.url} => ${file.name}`);
                if (index == files.length - 1) {
                    file.onload = () => {
                        progress.style.width = "100%";
                        text.innerText = "完成";
                        progress.dataset.status = text.innerText;
                    }
                } else {
                    file.onload = () => {
                        progress.style.width = Number.parseFloat(progress.style.width) + step + "%";
                    }
                }
                GM_download(file);
            });
            copyContent();
        }
    }
    btn.addEventListener('click', download);
    document.addEventListener("keydown", (event) => {
        // console.log(event.target);
        if (event.target.tagName == "INPUT" || event.target.tagName == "TEXTAREA" || event.repeat) {
            return;
        } else if (document.querySelector("#root > div:last-child").style.overflow != "") {
            if (event.key == "v") {
                document.querySelector("#root > div > button").click();
            }
            return;
        }
        let posts = Array.from(article.parentElement.querySelector("article ~ div:last-of-type").querySelectorAll("div > div")).map(p => p.children[0]);
        switch (event.key) {
            case " ": // Scroll to main content
                event.preventDefault();
                article.scrollIntoView({ behavior: "smooth", block: "nearest" });
                break;
            case "d": // Download files
                event.preventDefault();
                download();
                break;
            case "a": // Download files and like the post
                event.preventDefault();
                download();
            case "f": // Like the post
                event.preventDefault();
                article.parentElement.querySelector("article ~ div[class] button").click();
                break;
            case "v": // Open image viewer
                event.preventDefault();
                article.querySelector("a img").click();
                break;
            case "ArrowLeft": // Newer post
                event.preventDefault();
                if (posts[0]) {
                    posts[0].click();
                }
                break;
            case "ArrowRight": // Older post
                event.preventDefault();
                if (posts[1]) {
                    posts[1].click();
                }
                break;
        }
    });
}

waitForKeyElements("article h1", addDownloadButton);

function waitForKeyElements(e,t,a,n){var o,r;(o=void 0===n?$(e):$(n).contents().find(e))&&o.length>0?(r=!0,o.each(function(){var e=$(this);e.data("alreadyFound")||!1||(t(e)?r=!1:e.data("alreadyFound",!0))})):r=!1;var l=waitForKeyElements.controlObj||{},i=e.replace(/[^\w]/g,"_"),c=l[i];r&&a&&c?(clearInterval(c),delete l[i]):c||(c=setInterval(function(){waitForKeyElements(e,t,a,n)},300),l[i]=c),waitForKeyElements.controlObj=l}

// function waitForKeyElements(
//    selectorTxt, // Required: The jQuery selector string that specifies the desired element(s).
//    actionFunction, // Required: The code to run when elements are found. It is passed a jNode to the matched element.
//    bWaitOnce, // Optional: If false, will continue to scan for new elements even after the first match is found.
//    iframeSelector // Optional: If set, identifies the iframe to search.
// )