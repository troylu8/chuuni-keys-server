import { elem } from "./lib.js";

const SERVER_URL = "http://localhost:5000";
const CHARTS_PER_PAGE = 50;

class ChartCard extends HTMLElement {
    connectedCallback() {
        elem("img", {
            attrs: [
                ["src", 
                    this.hasAttribute("img-ext") ? 
                        `${SERVER_URL}/static/${this.getAttribute("online-id")}/img.${this.getAttribute("img-ext")}`:
                        "public/default-bg.png"
                ]
            ],
            parent: this
        });
        
        elem("h3", { text: this.getAttribute("title"), parent: this });
        
        elem("p", {
            text: this.getAttribute("credit-audio"), 
            parent: this
        });
        
        elem("a", {
            text: "play", 
            cls: "play-button",
            attrs: [["href", "chuuni://play/" + this.getAttribute("online-id")]],
            parent: this,
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
            console.log([id, title, difficulty, bpm, audio_ext, img_ext, credit_audio, credit_img, credit_chart]);
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