# 🌿 CharityChain — Decentralized Donation Platform

**CharityChain** is a Web3-based donation platform that allows users to create, manage, and donate to fundraising campaigns transparently on the blockchain.  
Built using **HTML**, **CSS**, and **Web3.js**, this DApp connects directly to **MetaMask** for seamless crypto-based donations using **KPGT tokens**.

---

## 🚀 Features

✅ **Connect Wallet (MetaMask)** – Securely connect or disconnect your wallet.  
✅ **Create Campaigns** – Start new fundraising campaigns with title, goal, image, and contact info.  
✅ **Donate in KPGT** – Donate easily using blockchain transactions.  
✅ **Live Progress Tracking** – Real-time progress bar for campaign goals.  
✅ **Cleanup Completed Campaigns** – Automatically move finished campaigns to the “Completed” page.  
✅ **Dark/Light Mode Toggle** – Persistent theme switcher using local storage.  
✅ **Toast Notifications & Loading States** – Smooth user feedback with custom notifications and loaders.  
✅ **Responsive Design** – Mobile-friendly UI with modern glassmorphism theme.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-------------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Web3 Integration | Web3.js (v1.10.0) |
| Smart Contract | Solidity (external ABI.js referenced) |
| Blockchain Network | Mandala Chain (KPGT Token) |
| Wallet | MetaMask |
| UI Enhancements | Toast messages, animated loaders, glass UI |
| Theme System | `theme.js` for persistent dark/light mode |

---

## 📁 Project Structure

```
📦 CharityChain
 ┣ 📜 index.html          → Main page showing active campaigns
 ┣ 📜 create_campaign.js   → Handles campaign creation logic
 ┣ 📜 donate.html          → Donation page for each campaign
 ┣ 📜 donate.js            → Donation logic and transaction handling
 ┣ 📜 completed.html       → Displays finished campaigns
 ┣ 📜 completed.js         → Loads completed campaign data
 ┣ 📜 app.js               → Core logic (wallet, cleanup, stats)
 ┣ 📜 theme.js             → Dark/light mode toggle and storage
 ┣ 📜 style.css            → Full UI design & animation styles
 ┣ 📜 abi.js               → Smart contract ABI & address
```

---

## ⚙️ How to Run

1. **Clone or extract the project** into your web server or local folder.
2. Make sure you have **MetaMask** installed in your browser.
3. Connect your wallet to the **Mandala Chain testnet** (or desired network).
4. Open `index.html` in your browser.
5. Create a campaign or donate using connected KPGT wallet.
6. Use the **🧹 Clean Up** button to move completed campaigns automatically.

---

## 🔗 Smart Contract Setup

1. Create or deploy your Solidity contract on Mandala Chain.
2. Update the `contractAddress` and `contractABI` inside **`abi.js`**.
3. Reload the website to link your DApp to the deployed contract.

---

## 🎨 UI & Design

- Green transparent theme with glassmorphism effect.  
- Smooth animations for buttons, cards, and notifications.  
- Fully responsive layout for desktop and mobile screens.  
- Includes thank-you animations and real-time donation stats.

---

## 💡 Example User Flow

1. User connects MetaMask wallet.  
2. User creates a fundraising campaign (goal in KPGT).  
3. Visitors can browse and donate to campaigns.  
4. Once a campaign reaches its goal, it automatically appears on **Completed Campaigns**.  
5. All actions are stored transparently on the blockchain.

---

## 👥 Contributors

- **Jay** — Frontend Development  
- **Austin Mikael Radit** — Smart Contract Integration  
- **Team Mandala Chain** — Token Infrastructure (KPGT)

---

## 🪪 License

This project is open-source and available under the **MIT License**.
