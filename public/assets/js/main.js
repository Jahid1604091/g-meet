import * as app from './app2.js'

const meetingContainer = document.getElementById("meetingContainer");
const urlParams = new URLSearchParams(window.location.search);
let meetingId = urlParams.get("meetingID");
let user_id = window.prompt("Enter your user id...");
if (!meetingId || !user_id) {
alert("Invalid user or meeting Id");
window.location.href = "/action.html";
}
meetingContainer.style.display = "block";

app.MyApp._init(user_id, meetingId);