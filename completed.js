// completed.js — enhanced with USD conversion, fee, timestamps & gallery

// --- Notification helper ---
function showNotification(message, type = "info", ttl = 5000) {
  const container = document.getElementById("toastContainer");
  if (!container) return alert(message);
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="title">${message}</div><button class="close">✕</button>`;
  container.appendChild(toast);
  toast.querySelector(".close").addEventListener("click", () => toast.remove());
  setTimeout(() => toast.remove(), ttl);
}

document.addEventListener("DOMContentLoaded", async () => {
  const completedList = document.getElementById("completedList");
  let web3, contract;

  try {
    if (typeof window.ethereum !== "undefined") {
      web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
    } else {
      showNotification(
        "⚠️ Please install MetaMask to view campaigns.",
        "error"
      );
      return;
    }

    contract = new web3.eth.Contract(contractABI, contractAddress);
    showNotification("🔄 Loading completed campaigns...", "info");

    const rate = await getKPGTtoUSD();
    const feePercent = await getPlatformFee(contract);

    await loadFromBlockchain(web3, contract, completedList, rate, feePercent);
  } catch (error) {
    console.error("Failed to initialize:", error);
    showNotification("❌ Failed to connect to blockchain.", "error");
  }
});

// --- Fetch live USD rate from CoinGecko ---
async function getKPGTtoUSD() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=kpg-token&vs_currencies=usd"
    );
    const data = await res.json();
    return data["kpg-token"]?.usd || 0;
  } catch {
    return 0;
  }
}

// --- Fetch platform fee percent ---
async function getPlatformFee(contract) {
  try {
    const fee = await contract.methods.platformFeePercent().call();
    return fee / 100;
  } catch {
    return 0;
  }
}

// --- Load blockchain data ---
async function loadFromBlockchain(
  web3,
  contract,
  completedList,
  rate,
  feePercent
) {
  try {
    const result = await contract.methods
      .getFinishedCampaignsPaginated(0, 50)
      .call();
    const campaigns = result[0] || result.campaigns || [];
    const total = result[1] || result.total || campaigns.length;

    if (campaigns.length > 0) {
      renderCompleted(campaigns, web3, completedList, rate, feePercent);
      showNotification(
        `✅ Loaded ${campaigns.length} completed campaigns.`,
        "success"
      );
    } else {
      completedList.innerHTML = `<p>No completed campaigns yet.</p>`;
    }
  } catch (err) {
    console.error("Blockchain load error:", err);
    showNotification("❌ Failed to fetch campaigns from blockchain.", "error");
  }
}

// --- Render cards ---
function renderCompleted(campaigns, web3, completedList, rate, feePercent) {
  completedList.innerHTML = "";

  campaigns.forEach((c, i) => {
    const goalEth = parseFloat(web3.utils.fromWei(c.goal || "0", "ether"));
    const raisedEth = parseFloat(
      web3.utils.fromWei(c.totalRaised || "0", "ether")
    );
    const usdGoal = rate ? ` (~$${(goalEth * rate).toFixed(2)})` : "";
    const usdRaised = rate ? ` (~$${(raisedEth * rate).toFixed(2)})` : "";
    const completionDate = c.endTimestamp
      ? new Date(parseInt(c.endTimestamp) * 1000).toLocaleDateString()
      : "Unknown";

    const images =
      c.imageURLs && c.imageURLs.length ? c.imageURLs : [c.imageURL];
    const mainImg = images[0] || "placeholder.jpg";

    const div = document.createElement("div");
    div.className = "campaign-card completed clickable";
    div.dataset.id = c.id || i; // fallback if id missing

    div.innerHTML = `
      <div class="image-gallery">
        <img src="${mainImg}" alt="${c.title}" class="main-img" />
      </div>
      <h3>${c.title}</h3>
      <p>${(c.description || "").slice(0, 120)}...</p>
      <div class="goal-info">
        <span><strong>Goal:</strong> ${goalEth.toFixed(2)} KPGT${usdGoal}</span>
        <span><strong>Raised:</strong> ${raisedEth.toFixed(
          2
        )} KPGT${usdRaised}</span>
      </div>
      <div class="fee-info">Platform Fee: ${feePercent.toFixed(2)}%</div>
      <div class="status success">✅ Completed</div>
    `;

    div.addEventListener("click", () => {
      window.location.href = `view.html?id=${c.id || i}`;
    });

    completedList.appendChild(div);
  });
}

// Load Footer
fetch("Footer.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("footer").innerHTML = data;
  });