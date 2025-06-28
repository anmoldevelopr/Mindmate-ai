const chatArea = document.getElementById("chat-area");
const topicSelect = document.getElementById("topic-select");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

let currentTopic = "";
let currentQuestion = null;
let usedIds = new Set();

// Utility to display messages
function addMessage(text, sender="bot") {
  const div = document.createElement("div");
  div.className = sender === "user" ? "user-message" : "bot-message";
  div.textContent = text;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Fetch aptitude questions
async function fetchAptitude(topic) {
  const map = {
    percentage: "Random",
    profitLoss: "ProfitAndLoss",
    timeWork: "Random"
    // extend as needed
  };
  const endpoint = map[topic] || "Random";
  const url = `https://aptitude-api.vercel.app/${endpoint}`;
  const res = await fetch(url);
  const data = await res.json();
  return {
    id: data.question,
    question: data.question,
    answer: data.answer,
    explanation: data.explanation,
    options: data.options || []
  };
}

// Fetch GK / Trivia questions
async function fetchTrivia(category) {
  const sessionToken = sessionStorage.getItem("triviaToken") || "";
  let url = `https://opentdb.com/api.php?amount=1&type=multiple`;
  if (!sessionToken) {
    const tokenRes = await fetch("https://opentdb.com/api_token.php?command=request");
    const tokenJson = await tokenRes.json();
    sessionStorage.setItem("triviaToken", tokenJson.token);
    url += `&token=${tokenJson.token}`;
  } else url += `&token=${sessionToken}`;

  if (category !== "currentAffairs") {
    const catMap = { sports: 21, history: 23, geography: 22, politics:24 };
    url += catMap[category] ? `&category=${catMap[category]}` : "";
  }
  const res = await fetch(url);
  const data = await res.json();
  if (data.response_code !== 0) throw new Error("Trivia token reset");
  const q = data.results[0];
  return {
    id: q.question,
    question: q.question,
    options: [...q.incorrect_answers, q.correct_answer],
    answer: q.correct_answer,
    explanation: ""
  };
}

// Ask next question
async function askQuestion() {
  if (!currentTopic) {
    addMessage("⚠️ Select a topic first.");
    return;
  }
  let qObj;
  try {
    if (["percentage","profitLoss","timeWork"].includes(currentTopic)) {
      qObj = await fetchAptitude(currentTopic);
    } else {
      qObj = await fetchTrivia(currentTopic);
    }
  } catch (e) {
    addMessage("⚠️ Failed to load. Try again.");
    return;
  }

  if (usedIds.has(qObj.id)) {
    return askQuestion();
  }
  usedIds.add(qObj.id);
  currentQuestion = qObj;

  addMessage("🧠 " + qObj.question);
  if (qObj.options?.length) {
    const opts = qObj.options.sort(() => Math.random() - 0.5);
    addMessage("Options: " + opts.join(" | "));
  }
}

// Handle answer submission
sendBtn.addEventListener("click", () => {
  const ans = userInput.value.trim();
  if (!ans || !currentQuestion) return;
  addMessage(ans, "user");

  const correct = currentQuestion.answer.toLowerCase();
  if (ans.toLowerCase() === correct) addMessage("✅ That's correct!");
  else addMessage(`❌ Wrong. Answer: ${currentQuestion.answer}`);

  if (currentQuestion.explanation) addMessage(`📘 Explanation: ${currentQuestion.explanation}`);

  currentQuestion = null;
  userInput.value = "";
  setTimeout(askQuestion, 1000);
});

// Topic Change
topicSelect.addEventListener("change", () => {
  currentTopic = topicSelect.value;
  usedIds.clear();
  chatArea.innerHTML = "";
  addMessage(`🎯 Topic switched to: ${currentTopic}`);
  setTimeout(askQuestion, 500);
});

