const gameplayVideo = document.getElementById("showcase-gameplay-video");
const watchBtn = document.getElementById("watch-btn");

watchBtn.addEventListener("click", () => {
    if (gameplayVideo.paused) {
        gameplayVideo.play();
        watchBtn.style.color = "var(--red)";
        watchBtn.textContent = "pause";
        watchBtn.classList.replace("with-play-icon", "with-pause-icon");
    }
    else {
        gameplayVideo.pause();
        watchBtn.style.color = "";
        watchBtn.textContent = "resume";
        watchBtn.classList.replace("with-pause-icon", "with-play-icon");
    }
});