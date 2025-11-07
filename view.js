// view.js – read-only campaign details page with WITHDRAW button for owners
// NOTE: This file uses web3, contract, and accounts from app.js (already loaded)

let currentCampaignId;

// --- Toast notification ---
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

// --- Loading overlay ---
function showLoading(show, message = "Processing...") {
  let overlay = document.getElementById("loadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loadingOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      gap: 1rem;
    `;
    overlay.innerHTML = `
      <div class="spinner" style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #00c077; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span id="loadingText" style="color: white; font-size: 1.1rem;">${message}</span>
    `;
    document.body.appendChild(overlay);
    
    // Add spinner animation
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
  }
  const loadingText = overlay.querySelector('#loadingText');
  if (loadingText) loadingText.textContent = message;
  overlay.style.display = show ? "flex" : "none";
}

// ====== WITHDRAW FUNDS FUNCTION ======
async function withdrawFundsManually(campaignId) {
  try {
    // Check if web3 and contract are available from app.js
    if (typeof contract === 'undefined' || !contract) {
      showNotification("⚠️ Contract not initialized. Please refresh the page.", "error");
      return;
    }

    if (typeof accounts === 'undefined' || !accounts || accounts.length === 0) {
      showNotification("⚠️ Please connect your wallet first", "error");
      return;
    }

    const confirmed = confirm(
      "Are you sure you want to withdraw all available funds for this campaign?"
    );
    if (!confirmed) return;

    showNotification("Processing withdrawal...", "info");
    showLoading(true, "Submitting withdrawal transaction...");

    const tx = await contract.methods
      .withdrawFunds(campaignId)
      .send({
        from: accounts[0],
      })
      .on("transactionHash", (hash) => {
        console.log("Withdraw transaction hash:", hash);
        showLoading(true, "Waiting for confirmation...");
      })
      .on("receipt", (receipt) => {
        console.log("Withdraw receipt:", receipt);
      });

    console.log("Withdraw transaction completed:", tx.transactionHash);
    showLoading(false);
    showNotification("✅ Funds withdrawn successfully!", "success");

    // Reload campaign to update display
    await loadCampaignDetails();
  } catch (err) {
    showLoading(false);
    console.error("Withdraw failed:", err);
    
    let errorMessage = "Withdraw failed. ";
    if (err.message.includes("No funds to withdraw")) {
      errorMessage += "No funds available to withdraw.";
    } else if (err.message.includes("Not campaign owner")) {
      errorMessage += "You are not the campaign owner.";
    } else if (err.message.includes("Campaign not finished")) {
      errorMessage += "Campaign is not finished yet.";
    } else if (err.message.includes("User denied")) {
      errorMessage = "Transaction cancelled by user.";
    } else {
      errorMessage += "Check console for details.";
    }
    
    showNotification("❌ " + errorMessage, "error");
  }
}

// --- Load Campaign Details ---
async function loadCampaignDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  currentCampaignId = id;

  // Wait for web3 to be initialized from app.js
  let retries = 0;
  while ((typeof web3 === 'undefined' || typeof contract === 'undefined') && retries < 10) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }

  if (typeof web3 === 'undefined' || typeof contract === 'undefined') {
    showNotification("Failed to initialize Web3. Please refresh the page.", "error");
    return;
  }

  try {
    const c = await contract.methods.getCampaign(id).call();

    document.getElementById("campaignTitle").innerText =
      c.title || "Untitled Campaign";
    document.getElementById("campaignDesc").innerText =
      c.description || "No description available.";
    document.getElementById("ownerName").innerText = c.ownerName || "Unknown";
    document.getElementById("ownerContact").innerText = c.ownerContact || "N/A";
    document.getElementById("goal").innerText = `${web3.utils.fromWei(
      c.goal || "0",
      "ether"
    )} KPGT`;
    document.getElementById("raised").innerText = `${web3.utils.fromWei(
      c.totalRaised || "0",
      "ether"
    )} KPGT`;

    // --- Handle Image Gallery ---
    const gallery = document.getElementById("campaignGallery");
    if (gallery) {
      gallery.innerHTML = "";
      const urls =
        c.imageURLs && c.imageURLs.length > 0 ? c.imageURLs : [c.imageURL];

      if (urls.length === 1) {
        const img = document.createElement("img");
        img.src = urls[0];
        img.className = "campaign-image-single";
        img.alt = "Campaign";
        img.onerror = function () {
          this.src = "placeholder.jpg";
        };
        gallery.appendChild(img);
      } else {
        gallery.className = "image-carousel";
        urls.forEach((url, index) => {
          const img = document.createElement("img");
          img.src = url;
          img.className = `gallery-img ${index === 0 ? "active" : ""}`;
          img.alt = `Campaign Image ${index + 1}`;
          img.onerror = function () {
            this.src = "placeholder.jpg";
          };
          img.onclick = () => {
            document
              .querySelectorAll(".gallery-img")
              .forEach((i) => i.classList.remove("active"));
            img.classList.add("active");
          };
          gallery.appendChild(img);
        });
      }
    }

    // ====== ADD WITHDRAW BUTTON IF OWNER AND FINISHED ======
    const currentAddress = accounts && accounts[0] ? accounts[0].toLowerCase() : null;
    const ownerAddress = c.ownerWallet.toLowerCase();
    const isFinished = c.finished;

    console.log("Campaign status check:");
    console.log("- Campaign ID:", id);
    console.log("- Current address:", currentAddress);
    console.log("- Owner address:", ownerAddress);
    console.log("- Is finished:", isFinished);
    console.log("- Is owner:", currentAddress === ownerAddress);

    // Remove existing withdraw button or info message if any
    const existingWithdrawBtn = document.getElementById("withdrawBtn");
    if (existingWithdrawBtn) {
      existingWithdrawBtn.remove();
    }
    const existingInfoMsg = document.getElementById("withdrawInfo");
    if (existingInfoMsg) {
      existingInfoMsg.remove();
    }

    // Check if current user is owner AND campaign is finished
    if (currentAddress && currentAddress === ownerAddress && isFinished) {
      // Check if there are pending withdrawals
      const pendingAmount = await contract.methods.pendingWithdrawals(id).call();
      const pendingKPGT = parseFloat(web3.utils.fromWei(pendingAmount, "ether"));
      
      console.log("- Pending withdrawals:", pendingKPGT, "KPGT");

      // Find a good place to add the button (after the goal-info section)
      const goalInfo = document.querySelector(".goal-info");
      
      if (pendingKPGT > 0 && goalInfo) {
        const withdrawContainer = document.createElement("div");
        withdrawContainer.id = "withdrawInfo";
        withdrawContainer.style.cssText = "margin-top: 2rem; text-align: center;";
        
        const withdrawBtn = document.createElement("button");
        withdrawBtn.id = "withdrawBtn";
        withdrawBtn.className = "btn-primary";
        withdrawBtn.style.cssText = `
          padding: 1rem 2rem;
          font-size: 1.125rem;
          font-weight: 700;
          background: linear-gradient(135deg, #00c077, #00e68a);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 192, 119, 0.3);
        `;
        withdrawBtn.innerHTML = `
          💰 Withdraw Funds<br>
          <small style="font-size: 0.85em; font-weight: normal; opacity: 0.9;">
            ${pendingKPGT.toFixed(4)} KPGT available
          </small>
        `;
        withdrawBtn.onmouseover = function() {
          this.style.transform = "translateY(-2px)";
          this.style.boxShadow = "0 6px 20px rgba(0, 192, 119, 0.5)";
        };
        withdrawBtn.onmouseout = function() {
          this.style.transform = "translateY(0)";
          this.style.boxShadow = "0 4px 15px rgba(0, 192, 119, 0.3)";
        };
        withdrawBtn.onclick = () => withdrawFundsManually(id);
        
        withdrawContainer.appendChild(withdrawBtn);
        goalInfo.parentNode.insertBefore(withdrawContainer, goalInfo.nextSibling);
        
        console.log("✅ Withdraw button added for campaign owner");
      } else if (pendingKPGT === 0 && goalInfo) {
        console.log("ℹ️ No pending funds to withdraw (already withdrawn or auto-paid)");
        
        // Show info message
        const infoContainer = document.createElement("div");
        infoContainer.id = "withdrawInfo";
        infoContainer.style.cssText = `
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(0, 192, 119, 0.1);
          border: 1px solid rgba(0, 192, 119, 0.3);
          border-radius: 8px;
          text-align: center;
          color: var(--text-primary);
        `;
        infoContainer.innerHTML = `
          <strong>✅ Funds Already Withdrawn</strong><br>
          <small>All funds for this campaign have been successfully withdrawn.</small>
        `;
        goalInfo.parentNode.insertBefore(infoContainer, goalInfo.nextSibling);
      }
    } else if (!currentAddress && isFinished) {
      console.log("ℹ️ Please connect wallet to check withdrawal eligibility");
    } else if (!isFinished) {
      console.log("ℹ️ Campaign is not finished yet");
    }

    // Load donations
    await loadDonations(contract, id, web3);
  } catch (err) {
    console.error("Error loading campaign:", err);
    showNotification(
      "Failed to load campaign details. Please check your connection and try again.",
      "error"
    );
  }
}

// --- Load Donations ---
async function loadDonations(contract, id, web3) {
  const body = document.getElementById("donationBody");
  try {
    const donations = await contract.methods.getDonations(id).call();

    if (!donations || donations.length === 0) {
      body.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No donations recorded.</td></tr>`;
      return;
    }

    body.innerHTML = "";
    
    // Reverse to show newest first
    [...donations].reverse().forEach((d) => {
      const amountEth = parseFloat(
        web3.utils.fromWei(d.amount, "ether")
      ).toFixed(4);
      const date = d.timestamp
        ? new Date(parseInt(d.timestamp) * 1000).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const donor = `${d.donor.slice(0, 8)}...${d.donor.slice(-6)}`;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${donor}</td>
        <td><strong>${amountEth} KPGT</strong></td>
        <td>${date}</td>
      `;
      body.appendChild(row);
    });
  } catch (err) {
    console.error("Donation history load error:", err);
    body.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-error);">Error loading donation history.</td></tr>`;
  }
}

// --- Initialize on Page Load ---
document.addEventListener("DOMContentLoaded", async () => {
  // Wait a bit for app.js to initialize
  await new Promise(resolve => setTimeout(resolve, 300));
  
  await loadCampaignDetails();

  // Listen for account changes (accounts is from app.js)
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (newAccounts) => {
      if (newAccounts.length > 0) {
        // app.js will update the accounts variable
        await new Promise(resolve => setTimeout(resolve, 200));
        await loadCampaignDetails();
      }
    });

    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });
  }
});

// Load Footer
fetch("Footer.html")
  .then((res) => res.text())
  .then((data) => {
    document.getElementById("footer").innerHTML = data;
  });