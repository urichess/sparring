document.addEventListener("DOMContentLoaded", function() {
    // Load data from localStorage
    function loadDataFromStorage() {
        document.getElementById("username").value = localStorage.getItem("lichessUsername") || "";
        document.getElementById("timeControl").value = localStorage.getItem("lichessTimeControl") || "3+2";
        document.getElementById("lichessToken").value = localStorage.getItem("lichessToken") || "";
        document.getElementById("fenList").value = localStorage.getItem("fenList") || "";
        document.getElementById("studyLink").value = localStorage.getItem("lichessStudyLink") || "";
        document.getElementById("color").value = localStorage.getItem("lichessColor") || "random";
        document.getElementById("removeFen").checked = localStorage.getItem("removeFen") === "true";
        
        let opponent = localStorage.getItem("lichessOpponent") || "user";
        document.getElementById("challengeUser").checked = opponent === "user";
        document.getElementById("challengeStockfish").checked = opponent === "stockfish";
    }

    // Save data to localStorage
    function saveDataToStorage() {
        localStorage.setItem("lichessUsername", document.getElementById("username").value);
        localStorage.setItem("lichessTimeControl", document.getElementById("timeControl").value);
        localStorage.setItem("lichessToken", document.getElementById("lichessToken").value);
        localStorage.setItem("fenList", document.getElementById("fenList").value);
        localStorage.setItem("lichessStudyLink", document.getElementById("studyLink").value);
        localStorage.setItem("lichessColor", document.getElementById("color").value);
        localStorage.setItem("removeFen", document.getElementById("removeFen").checked);
        localStorage.setItem("lichessOpponent", document.querySelector('input[name="opponent"]:checked').value);
    }

    // Event listeners to save data to localStorage on field change
    document.getElementById("username").addEventListener("input", saveDataToStorage);
    document.getElementById("timeControl").addEventListener("input", saveDataToStorage);
    document.getElementById("lichessToken").addEventListener("input", saveDataToStorage);
    document.getElementById("fenList").addEventListener("input", saveDataToStorage);
    document.getElementById("studyLink").addEventListener("input", saveDataToStorage);
    document.getElementById("color").addEventListener("change", saveDataToStorage);
    document.getElementById("removeFen").addEventListener("change", saveDataToStorage);
    document.querySelectorAll('input[name="opponent"]').forEach(radio => {
        radio.addEventListener("change", saveDataToStorage);
    });

    // Load data from localStorage when the page is loaded
    loadDataFromStorage();

    // Event listener for file input
    document.getElementById("pgnFile").addEventListener("change", function() {
        let pgnFile = document.getElementById("pgnFile").files[0];
        if (pgnFile) {
            let reader = new FileReader();
            reader.onload = function(e) {
                let pgn = e.target.result;
                let regex = /\[FEN\s+"([^"]+)"\]/g;
                let match;
                let fenPositions = [];
                while (match = regex.exec(pgn)) {
                    fenPositions.push(match[1]);
                }
                if (fenPositions.length > 0) {
                    document.getElementById("fenList").value = fenPositions.join("\n");
                    saveDataToStorage();
                } else {
                    alert("No FEN positions found in the PGN file.");
                }
            };
            reader.readAsText(pgnFile);
        }
    });

    // Event listener for fetching study
    document.getElementById("fetchStudy").addEventListener("click", function() {
        let studyLink = document.getElementById("studyLink").value;
        let regex = /\/study\/([a-zA-Z0-9]+)/;
        let match = studyLink.match(regex);
        if (match) {
            let studyId = match[1];
            let url = `https://lichess.org/api/study/${studyId}.pgn`;
            let lichessToken = document.getElementById("lichessToken").value;

            fetch(url, {
                headers: {
                    "Authorization": "Bearer " + lichessToken
                }
            })
            .then(response => response.text())
            .then(pgn => {
                let regex = /\[FEN\s+"([^"]+)"\]/g;
                let match;
                let fenPositions = [];
                while (match = regex.exec(pgn)) {
                    fenPositions.push(match[1]);
                }
                if (fenPositions.length > 0) {
                    document.getElementById("fenList").value = fenPositions.join("\n");
                    saveDataToStorage();
                } else {
                    alert("No FEN positions found in the study.");
                }
            })
            .catch(error => {
                alert("Error fetching study: " + error);
            });
        } else {
            alert("Invalid study link.");
        }
    });

    // Add event listener for Enter key in study link input
    document.getElementById("studyLink").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            document.getElementById("fetchStudy").click(); // Trigger button click
        }
    });

    // Handle challenge form submission
    document.getElementById("challengeForm").addEventListener("submit", function(event) {
        event.preventDefault();

        let username = document.getElementById("username").value;
        let timeControl = document.getElementById("timeControl").value;
        let lichessToken = document.getElementById("lichessToken").value;
        let fenList = document.getElementById("fenList").value;
        let studyLink = document.getElementById("studyLink").value;
        let color = document.getElementById("color").value;
        let removeFen = document.getElementById("removeFen").checked;
        let opponent = document.querySelector('input[name="opponent"]:checked').value;

        // Save data to localStorage
        saveDataToStorage();

        let fenPositions = fenList.split("\n").filter(fen => fen.trim() !== "");
        if (fenPositions.length > 0) {
            let randomFen = fenPositions[Math.floor(Math.random() * fenPositions.length)];
            if (opponent === "stockfish") {
                sendStockfishChallenge(timeControl, randomFen, color, lichessToken);
            } else {
                sendChallenge(username, timeControl, randomFen, color, lichessToken);
            }
            if (removeFen) {
                fenPositions = fenPositions.filter(fen => fen !== randomFen);
                document.getElementById("fenList").value = fenPositions.join("\n");
                localStorage.setItem("fenList", fenPositions.join("\n"));
            }
        } else {
            alert("Please provide FEN positions either by uploading a PGN file, entering them manually, or fetching from a study.");
        }
    });

    function sendChallenge(username, timeControl, fen, color, token) {
        let url = "https://lichess.org/api/challenge/" + username;
        let data = {
            "clock.limit": parseInt(timeControl.split("+")[0]) * 60,
            "clock.increment": parseInt(timeControl.split("+")[1]),
            "color": color,
            "variant": "standard"
        };
        if (fen) {
            data["fen"] = fen;
        }

        fetch(url, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }).then(response => {
            if (response.ok) {
                response.json().then(json => {
                    let challengeUrl = json.url;
                    window.open(challengeUrl, '_blank');
                });
            } else {
                response.json().then(json => alert("Error: " + json.error));
            }
        }).catch(error => {
            alert("Error: " + error);
        });
    }

    function sendStockfishChallenge(timeControl, fen, color, token) {
        let url = "https://lichess.org/api/challenge/ai";
        let data = {
            "clock.limit": parseInt(timeControl.split("+")[0]) * 60,
            "clock.increment": parseInt(timeControl.split("+")[1]),
            "color": color,
            "variant": "standard",
            "level": 8 // Set the Stockfish level (1 to 8)
        };
        if (fen) {
            data["fen"] = fen;
        }

        fetch(url, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }).then(response => {
            if (response.ok) {
                response.json().then(json => {
                    let challengeUrl = `https://lichess.org/${json.id}`;
                    window.open(challengeUrl, '_blank');
                });
            } else {
                response.json().then(json => alert("Error: " + json.error));
            }
        }).catch(error => {
            alert("Error: " + error);
        });
    }
});

