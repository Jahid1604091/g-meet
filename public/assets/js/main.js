import * as app from './app2.js'

const meetingContainer = document.getElementById("meetingContainer");
const urlParams = new URLSearchParams(window.location.search);
//get the meeting id
let meetingId = urlParams.get("meetingID");
let user_id = window.prompt("Enter your username..."); //basically username
if (!meetingId || !user_id) {
    window.prompt("Invalid user or meeting Id");
    window.location.href = "/index.html";
}
meetingContainer.style.display = "block";

app.MyApp._init(user_id, meetingId);