// ==UserScript==
// @name         Pixiv Fanbox Downloader
// @version      0.9.9.1
// @description  Download Pixiv Fanbox images and files.
// @icon         https://www.fanbox.cc/favicon.ico
// @author       Mike Lei
// @match        https://*.fanbox.cc/*
// @exclude      /^https:\/\/www\.fanbox\.cc\/[^@].+$/
// @resource     style https://github.com/mikelei8291/Userscripts/raw/master/pixiv-fanbox-downloader/style.css#sha384=mKGr7rQjV7k9JciV56L/ZoP+YomUruSwKeZeL9AeoXmjJHdT0FpNd7OBWlEQJ2qM
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_download
// @noframes
// ==/UserScript==

"use strict";

// Constants
const tokenRegex = /{(?<default>[^{}]*?)(?:\|(?<format>.*?{(?<token>.+?)}.*?)|)}/g;
const defaultConfig = {
    downloadDir: "",
    userDir: "{username} ({userId})",
    basename: "fanbox {creatorId} {postId}{|_{index}}{|_{filename}}",
    subDirThreshold: 10
};
const apiUrl = JSON.parse(document.getElementById("metadata").content).apiUrl;

// Initialize config
if (!GM_getValue("newScheme")) {
    GM_deleteValue("userDir");
    GM_deleteValue("basename");
    GM_setValue("newScheme", true);
}
Object.entries(defaultConfig).forEach(([key, value]) => {
    this[key] = GM_getValue(key) ?? GM_setValue(key, value) ?? value;
});

const createElement = (tagName, attributes = {}, ...children) => {
    const element = Object.assign(document.createElement(tagName), attributes);
    element.append(...children);
    return element;
}

const waitElement = (selector, callback, once = true, mount = document.body) => {
    new MutationObserver((...[, obs]) => {
        const target = document.querySelector(selector);
        if (!!target && !Object.hasOwn(target, "__waitElementFound__")) {
            callback(target, obs);
            if (once) {
                obs.disconnect();
            } else {
                Object.defineProperty(target, "__waitElementFound__", {});
            }
        }
    }).observe(mount, { childList: true, subtree: true });
}

const createProfileLink = (href, className) => {
    document.querySelector("div:last-child > div > div > h1 ~ div").appendChild(
        createElement("a", { href, target: "_blank", rel: "noopener referrer" }, createElement("span", { className }))
    );
}

if (location.pathname.startsWith("/@")) {
    location = document.querySelector("link[rel=canonical]").href;
}

document.head.appendChild(GM_addStyle(GM_getResourceText("style")));

// Create <button> element
const btn = createElement("button", { id: "fanbox-dl-btn" });
const btnText = createElement("span");
const progress = createElement("div", { className: "btn-progress" });
btn.appendChild(btnText);
btn.appendChild(progress);

// Set button text
const setButtonText = (value) => {
    btnText.innerText = value;
    progress.dataset.status = value; // For layered button texts
}

const setProgress = (value, inc = false) => {
    if (inc) {
        value += parseFloat(progress.style.width);
    }
    progress.style.width = `${value}%`;
}

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

const formatFilename = (info) => {
    return [downloadDir, format(userDir, info), info.subDir, format(basename, info)].filter(path => !!path).join("/");
}

const apiFetch = async (path, param) => {
    return fetch(`${apiUrl}/${path}?${new URLSearchParams(param)}`, {
        method: "GET",
        headers: { accept: "application/json" },
        mode: "cors",
        credentials: "include"
    }).then(data => data.json()).then(data => data.body);
}

const fetchPostData = async () => {
    return apiFetch("post.info", { postId: location.pathname.split("/").pop() });
}

const fetchCreatorData = async () => {
    return apiFetch("creator.get", {
        creatorId: JSON.parse(document.getElementById("metadata").content).urlContext.host.creatorId
            ?? document.querySelector("link[rel=canonical]").href.match(/(?<=\/\/)\w+/)[0]
    });
}

const copyContent = async () => {
    if (!postData) {
        postData = await fetchPostData();
    }
    let date = new Date(postData.publishedDatetime);
    date = `${date.toLocaleDateString("zh-CN", {dateStyle: "long"})} ${date.toLocaleTimeString("zh-CN", {timeStyle: "short", hour12: false})}`;
    let content = `${postData.title}\n${location.href}\n${date}・${!!postData.feeRequired ? `¥${postData.feeRequired}` : "对所有人公开"}`;
    if (!!postData.body) {
        let text = postData.body.text;
        if (!!postData.body.blocks) {
            text = postData.body.blocks.filter(block => block.type === "p").map(block => block.text).join("\n");
        }
        if (!!text) {
            content += `\n\n${text.trim().replace(/\n{3,}/g, "\n\n")}`;
        }
        if (!!postData.tags.length) {
            content += `\n\n${postData.tags.map(tag => `#${tag}`).join(" ")}`;
        }
    }
    navigator.clipboard.writeText(content);
}

const download = async () => {
    setProgress(0);
    postData = await fetchPostData();
    let info = {
        username: postData.user.name.replaceAll("/", "／"),
        creatorId: postData.creatorId,
        userId: postData.user.userId,
        postId: postData.id
    };
    const formattedBasename = format(basename, info);
    if (!!postData.body) {
        let files = !!postData.body.blocks ? postData.body.blocks.filter(
            block => block.type === "file" || block.type === "image"
        ).map(block => {
            if (block.type === "file") {
                return postData.body.fileMap[block.fileId];
            } else if (block.type === "image") {
                return {...postData.body.imageMap[block.imageId], url: postData.body.imageMap[block.imageId].originalUrl};
            }
        }) : [].concat(postData.body.files, postData.body.images).filter(file => !!file).map(file => {
            if (!!file.originalUrl) {
                file.url = file.originalUrl;
            }
            return file;
        });
        if (files.length == 0) {
            setButtonText("无文件");
        } else {
            setButtonText("下载中");
            if (files.length > 1) {
                if (files.length >= subDirThreshold) {
                    info.subDir = formattedBasename;
                }
                let padLength = files.length.toString().length;
                if (padLength < 2) { padLength = 2; }
                files.map((file, index) => {
                    info.index = String(index + 1).padStart(padLength, "0");
                    info.filename = file.name;
                    file.name = `${formatFilename(info)}.${file.extension}`;
                    return file;
                });
            } else { // files.length == 1
                info.filename = files[0].name;
                files[0].name = `${formatFilename(info)}.${files[0].extension}`;
            }
            let step = 100 / files.length;
            let finished = 0;
            files.forEach(file => {
                console.log(`${file.url} => ${file.name}`);
                file.onload = () => {
                    if (++finished < files.length) {
                        setProgress(step, true);
                    } else {
                        setProgress(100);
                        setButtonText("完成");
                    }
                }
                GM_download(file);
            });
            await copyContent();
            return;
        }
    } else {
        setButtonText("需要赞助");
    }
    navigator.clipboard.writeText(formattedBasename);
}

btn.addEventListener('click', download);

document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea")
        || event.repeat || event.altKey || event.ctrlKey || event.shiftKey
        || !location.pathname.match(/^(?:\/@.+|)\/posts\/\d+$/)
    ) {
        return;
    } else if (document.querySelector("#root > div:last-child").style.overflow != "") {
        // Disable other keyboard shortcuts when image viewer is open
        if (event.key == "v") { // Close image viewer
            document.querySelector("#root > div > button").click();
        }
        return;
    }
    let elem;
    switch (event.key) {
        case " ": // Scroll to main content
            event.preventDefault();
            document.querySelector("article").scrollIntoView({ behavior: "smooth", block: "nearest" });
            break;
        case "d": // Download files
            event.preventDefault();
            download();
            break;
        case "s": // Download files and like the post
            event.preventDefault();
            download();
            // fall through
        case "a": // Like the post
            event.preventDefault();
            document.querySelector("article ~ div[class] button").click();
            break;
        case "v": // Open image viewer
            event.preventDefault();
            elem = document.querySelector("article a img");
            if (!!elem) { elem.click(); }
            break;
        case "ArrowLeft": // Newer post
        case "q":
            event.preventDefault();
            elem = document.querySelector("article ~ div:last-of-type > div:first-child > a");
            if (!!elem) { elem.click(); }
            break;
        case "ArrowRight": // Older post
        case "e":
            event.preventDefault();
            elem = document.querySelector("article ~ div:last-of-type > div:last-child > a");
            if (!!elem) { elem.click(); }
            break;
    }
});

let postData;

waitElement("article h1", (target) => {
    // Initialize post data
    postData = null;
    setProgress(0);
    setButtonText("下载文件");
    target.before(btn);
    target.addEventListener("click", copyContent);
}, false);

waitElement("a > div[style]", () => {
    fetchCreatorData().then(data => {
        if (!data.profileLinks.some(
            link => link.match(/^https:\/\/(?:www\.|)pixiv\.net\/(?:en\/|)(?:u(?:sers|)\/|member\.php\?id=)\d+$/)
        )) {
            createProfileLink(`https://www.pixiv.net/users/${data.user.userId}`, "pixiv-profile-icon");
        }
    });
});