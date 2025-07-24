import { elem } from "./lib.js";

const SERVER_URL = "http://localhost:5000";
const CHARTS_PER_PAGE = 50;

const audio = new Audio();
let lastPlayingChartId = null;

function activateListenBtn(btn) {
    btn.classList.replace("listen-btn-paused", "listen-btn-playing");
    btn.textContent = "pause";
}
function resetListenBtn(btn) {
    btn.classList.replace("listen-btn-playing", "listen-btn-paused");
    btn.textContent = "listen";
}
function resetLastListenBtn() {
    if (lastPlayingChartId)
        resetListenBtn(document.getElementById(lastPlayingChartId + "-listen-btn"));
}

class ChartCard extends HTMLElement {
    connectedCallback() {
        const onlineId = this.getAttribute("online-id");
        
        const imgExt = this.getAttribute("img-ext");
        const imgSrc = imgExt ? 
                        `${SERVER_URL}/static/charts/${onlineId}/img.${imgExt}`:
                        "public/img/default-bg.png";
        
        let diff = this.getAttribute("difficulty");
        if (diff.length > 5) {
            diff = diff.substring(0, 4) + "."
        }
        
        const creditAudio = this.getAttribute("credit-audio");
        const creditImg = this.getAttribute("credit-img");
        const creditChart = this.getAttribute("credit-chart");
        
        this.innerHTML = `
            <div class="entry-diamond">
                <div class="entry-img-cont">
                    <img src="${imgSrc}" />
                </div>
                <div class="entry-difficulty-cont">
                    <p>${diff}</p>
                </div>
            </div>

            <div class="entry-content">
                <header>
                    <h2>${this.getAttribute("title")}</h2>
                    <div class="entry-credits">
                        ${creditAudio ? `<span class="credit-audio">${creditAudio}</span>` : ""}
                        ${creditImg ? `<span class="credit-img">${creditImg}</span>` : ""}
                        ${creditChart ? `<span class="credit-chart">${creditChart}</span>` : ""}
                    </div>
                </header>

                <div class="entry-content-btns"></div>
            </div>
        `;
        
        const buttonsCont = this.querySelector(".entry-content-btns");
        
        const listenBtn = elem("button", { parent: buttonsCont, text: "listen", cls: "listen-btn-paused", id: onlineId + "-listen-btn" });
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
        
        
        const playBtn = elem("button", { parent: buttonsCont, text: "play", cls: "play-btn" });
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



(async () => {
    
    const chartsList = document.querySelector("#charts-list");
    
    try {
        const chartsResp = await fetch(SERVER_URL + "/charts/0");
        if (!chartsResp.ok) 
            throw new Error(`[${chartsResp.status}] - ${chartsResp.statusText}`);
        
        const [count, visibleCharts] = await chartsResp.json();
        
        // update chart count display
        document.getElementById("chart-count").textContent = count + " total charts";
        
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
    
    document.getElementById("loading-spinner").remove();
    
})();