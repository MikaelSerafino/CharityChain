// view.js — read-only campaign details page

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!window.ethereum) {
    alert("Please install MetaMask to view this page.");
    return;
  }

  const web3 = new Web3(window.ethereum);
  const contract = new web3.eth.Contract(contractABI, contractAddress);

  try {
    // Fix: Use getCampaign(id) instead of campaigns(id) to match your contract
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
  } catch (err) {
    console.error("Error loading campaign:", err);
    alert(
      "Failed to load campaign details. Please check your connection and try again."
    );
  }

  // Load donations (assuming loadDonations is defined elsewhere or add it)
  await loadDonations(contract, id, web3);
});

// --- Load Donations ---
async function loadDonations(contract, id, web3) {
  const body = document.getElementById("donationBody");
  try {
    const donations = await contract.methods.getDonations(id).call();

    if (!donations || donations.length === 0) {
      body.innerHTML = `<tr><td colspan="4">No donations recorded.</td></tr>`;
      return;
    }

    body.innerHTML = "";
    donations.forEach((d) => {
      const amountEth = parseFloat(
        web3.utils.fromWei(d.amount, "ether")
      ).toFixed(3);
      const date = d.timestamp
        ? new Date(parseInt(d.timestamp) * 1000).toLocaleDateString()
        : "—";
      const donorName = d.donorName || "Anonymous";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${donorName}</td>
        <td>${amountEth} KPGT</td>
        <td>${date}</td>
      `;
      body.appendChild(row);
    });
  } catch (err) {
    console.error("Donation history load error:", err);
    body.innerHTML = `<tr><td colspan="4">Error loading donation history.</td></tr>`;
  }
}

// Load Footer
fetch("Footer.html")
  .then((res) => res.text())
  .then((data) => {
    document.getElementById("footer").innerHTML = data;
  });
