const SERVER_URL = "http://localhost:5000";
const CHARTS_PER_PAGE = 50;

class ChartCard extends HTMLElement {
    static observedAttributes = ["title", "credit_audio"]
    
    constructor() {
        super()
    }
    
    connectedCallback() {
        const titleElem = document.createElement("h3");
        titleElem.textContent = this.getAttribute("title");
        this.appendChild(titleElem);
        
        const creditAudioElem = document.createElement("p");
        creditAudioElem.textContent = this.getAttribute("credit_audio");
        this.appendChild(creditAudioElem);
        
        const playButton = document.createElement("a");
        playButton.href = "chuuni://play/" + this.getAttribute("chart-id");
        playButton.textContent = "play";
        this.appendChild(playButton);
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
        const chartCard = document.createElement("chart-card");
        chartCard.setAttribute("chart-id", id);
        chartCard.setAttribute("title", title);
        mainElem.appendChild(chartCard);
    }
    
})();