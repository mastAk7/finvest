<h1 align="center">💸 FinVest</h1>
<h3 align="center">AI + Blockchain powered Micro-Investment Platform</h3>

<p align="center">
  <img src="https://img.shields.io/badge/TechStack-MERN-blue?style=flat-square"/>
  <img src="https://img.shields.io/badge/AI-NLP%20Model-yellow?style=flat-square"/>
  <img src="https://img.shields.io/badge/Blockchain-Smart%20Contracts-green?style=flat-square"/>
  <img src="https://img.shields.io/badge/Status-Building%20for%20Hackathon-purple?style=flat-square"/>
</p>

---

## 👥 Team 4 Bytes
**Members:**  
🧑‍💻 Aryan Kansal  
🧑‍💻 Ragya Ranjan  
🧑‍💻 Chirag Nagar  

---

## 🚀 Overview
**FinVest** bridges the gap between **small borrowers** and **micro-investors** by using **AI + Blockchain** to simplify and secure micro-financing.  
Borrowers can express their loan needs in natural, casual, or local language, which our **NLP model** transforms into a **professional investor-ready pitch**.  
Investors then bid on opportunities, and our AI engine selects the best match — automatically executing **smart contracts** for trusted lending.

> 💡 Empowering India’s local entrepreneurs — from momo stall owners to street vendors — to access fair, transparent, and AI-driven microloans.

---

## ✨ Key Features

### 🧠 Slang-to-Pitch NLP Model
Transforms informal/local language borrower requests into polished investor pitches.
> “Mujhe momos stall set up krne ke liye 50000 ka loan chahiye.”  
> ⬇  
> “I’m seeking a ₹50,000 microloan to set up a small food stall near Saket Metro.”

---

### 👥 Dual Login System
Borrowers and Investors each have dedicated dashboards with secure authentication (Name, Age, Phone, Email, Aadhaar).

---

### 🤖 AI Investor Matching (`selector.py`)
Multiple investors may bid on a borrower’s pitch.  
Our AI ranking engine automatically selects the best offer based on:
- Interest rate  
- Reputation  
- Loan amount  
- Investor activity  

---

### 🪙 AI-Based Smart Contracts
Automatically generates and deploys **intelligent smart contracts** with clauses for:
- Weekly bank statement tracking  
- Cash-receipt verification  
- Legal compliance in case of default  
- Transparency of all fund usage  

After borrower acceptance, a blockchain confirmation popup displays:  
> ✅ *Smart Contract Created & Stored Successfully*  
> `Transaction Hash: 0xF9A7...3C2D`

---

### 🏆 Gamified Investor Leaderboard
Investors compete to support the best micro-ventures, ranked on investment volume, ROI, and successful repayments.

---

## 🧩 Tech Stack

| Layer | Technology |
|:------|:------------|
| **Frontend** | React.js, TailwindCSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB |
| **AI / NLP** | Python (Transformers, spaCy) |
| **Smart Contracts** | Solidity (Hardhat / Testnet) |
| **Blockchain Layer** | Ethereum / Polygon (Local or Testnet) |
| **Hosting** | AWS / Vercel / Render |

---

## 🔁 Workflow

```mermaid
flowchart TD
A[User Login] --> B{Role?}
B -->|Borrower| C[Submit loan request in native/slang language]
C --> D[AI Slang_to_Pitch model converts to investor pitch]
D --> E[Investors browse & bid on loan requests]
E --> F[Selector.py chooses best investor]
F --> G[Borrower reviews and accepts offer]
G --> H[Smart contract auto-generated and executed]
H --> I[Blockchain confirmation popup with hash]
