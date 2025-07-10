import { elem } from "./lib.js";

const SERVER_URL = "http://localhost:5000";
const CHARTS_PER_PAGE = 50;

class ChartCard extends HTMLElement {
    static observedAttributes = ["title", "credit_audio"]
    
    connectedCallback() {
        elem("h3", { text: this.getAttribute("title"), parent: this });
        
        elem("p", {
            text: this.getAttribute("credit_audio"), 
            parent: this
        });
        
        elem("a", { 
            text: "play", 
            attrs: [["href", "chuuni://play/" + this.getAttribute("chart-id")]],
            parent: this,
        });
    }
}
customElements.define("chart-card", ChartCard);

(async () => {
    
    const mainElem = document.querySelector("main");
    const chartCountElem = document.querySelector("#chart-count");
    
    const getChartsReq = await fetch(SERVER_URL + "/charts/0");
    if (!getChartsReq.ok) return;
    
    const [count, visibleCharts] = await getChartsReq.json();
    chartCountElem.textContent = count + " total charts";
    
    for (const [id, title] of visibleCharts) {
        elem("chart-card", {
            attrs: [["chart-id", id], ["title", title]],
            parent: mainElem,
        })
    }
    
})();