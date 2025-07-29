
/**
 * @typedef {Object} ElemOptions
 * @property {string} [id]
 * @property {string} [cls]
 * @property {string} [text]
 * @property {ElemAttrs} [attrs]
 * @property {HTMLElement} [parent]
 * 
 * @typedef {[string, any][]} ElemAttrs
 */


/**
 * Creates an element
 * @param {string} tag 
 * @param {ElemOptions} [options]
 */
function elem(tag, options) {
    
    const elem = document.createElement(tag);
    
    if (!options) return elem;
    
    const { id, cls, text, attrs, parent } = options;
    if (id) elem.id = id;
    if (cls) elem.className = cls;
    if (text) elem.textContent = text;
    if (attrs) {
        for (const [attr, val] of attrs) {
            if (val !== null && val !== undefined)
                elem.setAttribute(attr, val);
        }
    }
    if (parent) parent.appendChild(elem);
    
    return elem;
}


const SERVER_URL = "https://api-chuuni-keys.troylu.com";
// const SERVER_URL = "http://localhost:5000";
const CHARTS_PER_PAGE = 50;

const audio = new Audio();
let lastPlayingChartId = null;

function activateListenBtn(btn) {
    btn.classList.replace("with-play-icon", "with-pause-icon");
    btn.style.color = "var(--red)";
    btn.textContent = "pause";
}
function resetListenBtn(btn) {
    btn.classList.replace("with-pause-icon", "with-play-icon");
    btn.style.color = "";
    btn.textContent = "listen";
}
function resetLastListenBtn() {
    if (lastPlayingChartId)
        resetListenBtn(document.getElementById(lastPlayingChartId + "-listen-btn"));
}

/**
 * @param {string} text
 * @param {HTMLElement} parent
 * @param {string} [cls]
 */
function addHTMLEscapedText(text, parent, cls) {
    if (cls) {
        const span = elem("span", { cls, parent });
        span.appendChild(document.createTextNode(text));
    }
    else 
        parent.appendChild(document.createTextNode(text));
}

class ChartCard extends HTMLElement {
    connectedCallback() {
        const onlineId = this.getAttribute("online-id");
        
        const imgExt = this.getAttribute("img-ext");
        const imgSrc = imgExt ? 
                        `${SERVER_URL}/static/charts/${onlineId}/img.${imgExt}`:
                        "public/img/default-bg.png";
        
        this.innerHTML = `
            <div class="entry-diamond">
                <div class="entry-img-cont">
                    <img src="${imgSrc}" />
                </div>
                <div class="entry-difficulty-cont" style="background-color: var(--${this.getAttribute("difficulty")})">
                    <p class="entry-difficulty"></p>
                </div>
            </div>

            <div class="entry-content">
                <header>
                    <h2 class="entry-title"></h2>
                    <div class="entry-credits"></div>
                </header>

                <div class="entry-content-btns"></div>
            </div>
        `;
        
        // insert difficulty text
        const diff = this.getAttribute("difficulty");
        addHTMLEscapedText(
            diff.length > 5 ? diff.substring(0, 4) + "." : diff,
            this.querySelector(".entry-difficulty")
        );
        
        // insert title text
        addHTMLEscapedText(this.getAttribute("title"), this.querySelector(".entry-title"));
        
        // insert credit text
        const creditsElem = this.querySelector(".entry-credits");
        const creditAudio = this.getAttribute("credit-audio");
        const creditImg = this.getAttribute("credit-img");
        const creditChart = this.getAttribute("credit-chart");
        if (creditAudio) 
            addHTMLEscapedText(creditAudio, creditsElem, "credit-audio icon-before");
        if (creditImg) 
            addHTMLEscapedText(creditImg, creditsElem, "credit-img icon-before");
        if (creditChart) 
            addHTMLEscapedText(creditChart, creditsElem, "credit-chart icon-before");
        
        
        const buttonsCont = this.querySelector(".entry-content-btns");
        
        const listenBtn = elem("button", { 
            id: onlineId + "-listen-btn",
            cls: "icon-before-sm with-play-icon",
            text: "listen", 
            parent: buttonsCont, 
        });
        listenBtn.addEventListener("click", () => {
            if (lastPlayingChartId == onlineId) {
                if (audio.paused) {
                    audio.play();
                    activateListenBtn(listenBtn);
                }
                else {
                    audio.pause();
                    resetLastListenBtn();
                }
            }
            else {
                audio.src = `${SERVER_URL}/static/charts/${onlineId}/preview.${this.getAttribute("audio-ext")}`;
                audio.play();
                audio.addEventListener("ended", () => resetListenBtn(listenBtn));
                
                resetLastListenBtn();
                activateListenBtn(listenBtn);
                
                lastPlayingChartId = onlineId;
            }
        });
        
        
        const playBtn = elem("button", { 
            cls: "play-btn icon-before-sm",
            text: "play", 
            parent: buttonsCont, 
        });
        playBtn.addEventListener("click", () => {
            window.open("chuuni://play/"  + this.getAttribute("online-id"))
        });
        
    }
}
customElements.define("chart-card", ChartCard);

class ListingError extends HTMLElement {
    connectedCallback() {
        elem("header", { text: "Error getting charts", parent: this });
        elem("p", { text: this.getAttribute("reason"), parent: this });
    }
}
customElements.define("listing-error", ListingError);



const chartsList = document.querySelector("#charts-list");
const loadingSpinner = document.getElementById("loading-spinner");
const chartCountElem = document.getElementById("chart-count");

const prevBtn = document.getElementById("page-prev");
const nextBtn = document.getElementById("page-next");


const params = new URLSearchParams(document.location.search);
const currPage = Number(params.get("page") ?? 1);
const urlWithoutParams = window.location.origin + window.location.pathname;

const currPageElem = document.getElementById("curr-page");
currPageElem.textContent = currPage + " of ?";

if (currPage <= 1) 
    prevBtn.classList.add("disabled-link");
else 
    prevBtn.setAttribute("href", urlWithoutParams + "?page=" + Math.max(1, currPage - 1));

// by default, cannot advance to next page
nextBtn.classList.add("disabled-link");


async function loadChartsPage(page) {
    loadingSpinner.style.display = "block";
    chartsList.innerHTML = "";
    
    try {
        const chartsResp = await fetch(SERVER_URL + "/charts/" + page);
        if (!chartsResp.ok) 
            throw new Error(`[${chartsResp.status}] - ${chartsResp.statusText}`);
        
        const [totalCharts, visibleCharts] = await chartsResp.json();
        const lastPage = Math.ceil(totalCharts / CHARTS_PER_PAGE);
        
        // update chart count display
        chartCountElem.textContent = totalCharts + " total charts";
        
        // enable next button if this isn't the last page
        if (currPage < lastPage) {
            nextBtn.classList.remove("disabled-link");
            nextBtn.setAttribute("href", urlWithoutParams + "?page=" + (currPage + 1));
        }
        
        // update current page display
        currPageElem.textContent = currPage + " / " + lastPage;
        
        for (const [id, title, difficulty, bpm, audio_ext, img_ext, credit_audio, credit_img, credit_chart] of visibleCharts) {
            elem("chart-card", {
                attrs: [
                    ["online-id", id], 
                    ["title", title],
                    ["difficulty", difficulty],
                    ["bpm", bpm],
                    ["audio-ext", audio_ext],
                    ["img-ext", img_ext],
                    ["credit-audio", credit_audio],
                    ["credit-img", credit_img],
                    ["credit-chart", credit_chart],
                ],
                parent: chartsList,
            })
        }
    }
    catch (e) {
        elem("listing-error", {
            parent: chartsList, 
            attrs: [["reason", "" + e]]
        })
    }
    
    loadingSpinner.style.display = "none";
}

loadChartsPage(currPage);