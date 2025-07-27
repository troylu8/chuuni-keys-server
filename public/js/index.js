const gameplayVideo = document.getElementById("showcase-gameplay-video");
const watchBtn = document.getElementById("watch-btn");

// play/pause gameplay showcase
watchBtn.addEventListener("click", () => {
    watchBtn.style.animation = "none";
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


// download button
document.getElementById("download-windows").addEventListener("click", () => {
    window.open("https://github.com/troylu8/chuuni-keys/releases/latest/download/chuuni.keys-x64-setup.exe", "_self");
});