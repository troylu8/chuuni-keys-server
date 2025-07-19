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

class ListingError extends HTMLElement {
    static observedAttributes = ["reason"]
    
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
        
        // add chart count display
        elem("p", {
            id: "chart-count",
            text: count + " total charts",
            parent: chartsList.parentElement
        });
        
        for (const [id, title] of visibleCharts) {
            elem("chart-card", {
                attrs: [["chart-id", id], ["title", title]],
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
    document.getElementById("charts-count").style.display = "block";
    
})();