document.addEventListener("DOMContentLoaded", function() {
    // Load data from localStorage
    function loadDataFromStorage() {
        document.getElementById("username").value = localStorage.getItem("lichessUsername") || "";
        document.getElementById("timeControl").value = localStorage.getItem("lichessTimeControl") || "3+2";
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
        localStorage.setItem("fenList", document.getElementById("fenList").value);
        localStorage.setItem("lichessStudyLink", document.getElementById("studyLink").value);
        localStorage.setItem("lichessColor", document.getElementById("color").value);
        localStorage.setItem("removeFen", document.getElementById("removeFen").checked);
        localStorage.setItem("lichessOpponent", document.querySelector('input[name="opponent"]:checked').value);
    }

    // Event listeners to save data to localStorage on field change
    document.getElementById("username").addEventListener("input", saveDataToStorage);
    document.getElementById("timeControl").addEventListener("input", saveDataToStorage);
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
            const token = localStorage.getItem("oauth2Token");

            fetch(url, {
                headers: {
                    "Authorization": "Bearer " + token
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
        let fenList = document.getElementById("fenList").value;
        let studyLink = document.getElementById("studyLink").value;
        let color = document.getElementById("color").value;
        let removeFen = document.getElementById("removeFen").checked;
        let opponent = document.querySelector('input[name="opponent"]:checked').value;
        const token = localStorage.getItem("oauth2Token");


        // Save data to localStorage
        saveDataToStorage();

        let fenPositions = fenList.split("\n").filter(fen => fen.trim() !== "");
        if (fenPositions.length > 0) {
            let randomFen = fenPositions[Math.floor(Math.random() * fenPositions.length)];
            if (opponent === "stockfish") {
                sendStockfishChallenge(timeControl, randomFen, color, token);
            } else {
                sendChallenge(username, timeControl, randomFen, color, token);
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

    const clientId = "urichess-sparring"; // Replace with your OAuth2 client ID
    const currentUrlWithoutParams = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + window.location.pathname;

    const redirectUri = currentUrlWithoutParams;
//		"http://urichess.github.io/sparring:8000"; // Replace with your redirect URI
    const authEndpoint = "https://lichess.org/oauth"; // Replace with your OAuth2 provider's authorization endpoint
    const tokenEndpoint = "https://lichess.org/api/token"; // Replace with your OAuth2 provider's token endpoint
    const logoutEndpoint = "https://lichess.org/api/token"; // Replace with your OAuth2 provider's logout endpoint

    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");
    //const statusText = document.getElementById("status");
    const scopes = 'challenge:write study:read';

   loginButton.addEventListener("click", async function() {
        const state = generateRandomString(16);
        const codeVerifier = generateRandomString(128);
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        localStorage.setItem("pkce_code_verifier", codeVerifier);
        localStorage.setItem("oauth_state", state);

        const authUrl = `${authEndpoint}?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&scope=${scopes}`;
        window.location.href = authUrl;
    });

    logoutButton.addEventListener("click", function() {
        const token = localStorage.getItem("oauth2Token");
        fetch(logoutEndpoint, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
        }).then(response => {
            if (response.ok) {
                localStorage.removeItem("oauth2Token");
                updateUI(false);
            } else {
                alert("Logout failed");
            }
        }).catch(error => {
            alert("Error: " + error);
        });
    });

    function updateUI(loggedIn) {
        if (loggedIn) {
            loginButton.style.display = "none";
            logoutButton.style.display = "block";
            document.getElementById('fen-div').classList.remove('hidden');
    	    document.getElementById('fen-div').classList.add('visible');
            document.getElementById('challenge-div').classList.remove('hidden');
    	    document.getElementById('challenge-div').classList.add('visible');
            //statusText.textContent = "Logged in";
        } else {
            loginButton.style.display = "block";
            logoutButton.style.display = "none";
            document.getElementById('fen-div').classList.add('hidden');
    	    document.getElementById('fen-div').classList.remove('visible');
            document.getElementById('challenge-div').classList.add('hidden');
    	    document.getElementById('challenge-div').classList.remove('visible');
            //statusText.textContent = "Not logged in";
        }
    }

    async function handleAuthResponse() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");

        if (code && state) {
            const storedState = localStorage.getItem("oauth_state");
            if (state !== storedState) {
                alert("Invalid state");
                return;
            }
            localStorage.removeItem("oauth_state");

            const codeVerifier = localStorage.getItem("pkce_code_verifier");
            if (!codeVerifier) {
                alert("Code verifier not found");
                return;
            }
            localStorage.removeItem("pkce_code_verifier");

            const response = await fetch(tokenEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    code_verifier: codeVerifier
                })
            });

            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem("oauth2Token", data.access_token);
                updateUI(true);
                history.replaceState(null, null, window.location.pathname); // Remove the code from the URL
            } else {
                alert("Authentication failed");
            }
        } else {
            const token = localStorage.getItem("oauth2Token");
            if (token) {
                updateUI(true);
            } else {
                updateUI(false);
            }
        }
    }
    
    function generateRandomString(length) {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
    
    async function generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const hash = await crypto.subtle.digest("SHA-256", data);
        return base64UrlEncode(new Uint8Array(hash));
    }

    function base64UrlEncode(arrayBuffer) {
        return btoa(String.fromCharCode(...arrayBuffer))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    handleAuthResponse();
});

