# LoanAIML — Models package (what to share with backend)

This README is written for the backend developer who will integrate the model code into a Windows-based backend.

It explains which files to share, how the pieces work, minimal environment setup on Windows (PowerShell), how to run quick smoke tests, and important security notes.

---

## 1) What to share
Share the following files/folders (preserve relative paths):

- `models/` (entire folder)
  - `models/slang_to_pitch.py`  — converts informal/slang loan request text into a structured/professional pitch (uses Gemini if configured).
  - `models/selector.py`       — selects best investor offer using weighted scoring (principal vs interest).
  - `models/negotiator.py`     — negotiation logic (single-round negotiator and interactive runner).
  - `models/offers.json`       — sample offers (if present) for testing.
  - any other helper modules under `models/`.
- `prompts/pitch_prompt.txt`   — the prompt used by `slang_to_pitch` (if the backend wants to call the LLM or mimic the behavior).
- `requirements.txt`          — packages to install. (Install into a virtualenv.)

Note: You do NOT need to share the Flask app (`app/`) if the backend will integrate the model functions directly. If the backend wants the HTTP endpoints as-is, share the `app/routes/*.py` too.

---

## 2) High-level architecture / how this works

This project contains standalone model/utility modules. The backend can import and call them directly (no Flask required):

- slang_to_pitch.slang_to_pitch(user_text: str) -> Dict[str, Any]
  - Input: informal loan request string
  - Output: Dict with keys like `original_text`, `professional_pitch`, `extracted_info`
  - Behavior: If Gemini (Google Generative AI) is configured via an API key, it calls the model. Otherwise the function returns fallback text.

- selector.select_best_offer(offers: List[Dict], w_principal: float = 0.6, w_interest: float = 0.4) -> Dict
  - Input: list of offers (each must have keys `investor_id`, `principal`, `interest_annual_pct`, `tenure_months`)
  - Output: best offer dict augmented with `composite_score`

- negotiator.negotiate_round(investor_offer: dict, investor_message: str, history: Optional[list]=None) -> dict
  - Input: the investor's last numeric offer (investor_offer), their message, and conversation history
  - Output: dict with `status` ("continue"/"accepted"/"rejected"), `message` (bot text), `updated_offer`, and `history`

The backend typically will:
- Validate incoming user/investor data.
- Call these functions and use the returned dict to drive UI or business logic.

---

## 3) Environment setup (Windows PowerShell)

Recommended: create a virtual environment and install packages from `requirements.txt`.

Open PowerShell and run:

```powershell
# from project root (where requirements.txt is located)
python -m venv .venv
# Activate the venv (PowerShell)
.\.venv\Scripts\Activate.ps1
# Install deps
pip install --upgrade pip
pip install -r requirements.txt
```

If `google-generativeai` is used for Gemini access, it should be listed in `requirements.txt`. If not, install it explicitly:

```powershell
pip install google-generativeai
```

### Set the Gemini (GENAI) API key (do NOT share your private keys over chat/email)

The code shipped in `models/slang_to_pitch.py` previously contained a hard-coded API key. **DO NOT** commit or share hard-coded keys. Instead instruct the backend person to set an environment variable and update the file to read it.

In PowerShell (temporary for session):

```powershell
$env:GENAI_API_KEY = 'your-real-api-key-here'
```

To persist for the Windows user (so the key remains across sessions):

```powershell
setx GENAI_API_KEY "your-real-api-key-here"
```

Then restart PowerShell (or sign out/in) for `setx`-persisted variables to be available in new shells.

**Important:** If you already shared a file that contains a hard-coded API key (for example `models/slang_to_pitch.py` in the attachments), you must rotate that key immediately and remove it from the repo. Provide the backend person with a patched version that reads the key from `os.getenv('GENAI_API_KEY')`.

---

## 4) Quick smoke tests (Windows PowerShell)

From the project root and with the virtualenv activated:

1) Test `slang_to_pitch` (one-liner):

```powershell
python -c "from models.slang_to_pitch import slang_to_pitch; print(slang_to_pitch('meri momos ki shop lgane ke liye mujhe 50000 ka loan chahiye'))"
```

2) Test `selector.select_best_offer`:

```powershell
python -c "from models.selector import select_best_offer; offers=[{'investor_id':'A','principal':50000,'interest_annual_pct':10.0,'tenure_months':12},{'investor_id':'B','principal':60000,'interest_annual_pct':14.0,'tenure_months':12}]; print(select_best_offer(offers))"
```

3) Test `negotiator.negotiate_round` interactively by running the module (it includes an interactive runner):

```powershell
python models\negotiator.py
```

Or run a single round from the interpreter:

```powershell
python -c "from models.negotiator import negotiate_round; print(negotiate_round({'interest_annual_pct':15.0,'tenure_months':12}, 'I can do 14.5% and that\'s as low as I can go', []))"
```

These quick commands help validate the core behavior before integrating.

---

## 5) Integration snippets for the backend dev

1) slang_to_pitch example usage

```python
from models.slang_to_pitch import slang_to_pitch

def handle_borrower_text(text: str):
    result = slang_to_pitch(text)
    # result is a dict: { 'original_text', 'professional_pitch', 'extracted_info' }
    return result
```

2) select_best_offer example usage

```python
from models.selector import select_best_offer

offers = [
    {'investor_id':'INV1','principal':50000,'interest_annual_pct':12.0,'tenure_months':12},
    {'investor_id':'INV2','principal':60000,'interest_annual_pct':14.0,'tenure_months':12}
]
best = select_best_offer(offers, w_principal=0.6, w_interest=0.4)
# best is a dict with 'composite_score' added
```

3) negotiate_round example usage

```python
from models.negotiator import negotiate_round

current_offer = {'interest_annual_pct': 15.0, 'tenure_months': 12, 'investor_id': 'INV1'}
history = []
result = negotiate_round(current_offer, "I can do 14.5% and that's as low as I can go", history)
# result contains status, message, updated_offer, history
```

---

## 6) Security checklist (must share with backend person)

- Remove any hard-coded API keys from the repo. The attached copy of `models/slang_to_pitch.py` includes an API key; rotate it immediately. Replace with reading from `os.getenv('GENAI_API_KEY')`.
- If keys were accidentally committed to a remote repository, rotate them and remove them from history (use git filter-branch or BFG if needed).
- Limit access to the keys with least privilege.

---

## 7) Troubleshooting

- `ModuleNotFoundError`: Ensure you run commands from the project root and that `.` (project root) is on `PYTHONPATH` (when running scripts directly it will be). Activating the virtualenv and using `python -m` helps.
- `google.generativeai` import fails: `pip install google-generativeai`.
- API errors / empty response: ensure `GENAI_API_KEY` env var is set and valid; check network connectivity and quotas on the Google Generative AI console.
- JSON parsing errors from LLM: LLM responses can be noisy; the code attempts to extract JSON blocks — if parsing fails, inspect the raw output for debugging.

---

## 8) Recommended additional artifacts to send

- `requirements.txt` (already present) — exact dependency list.
- `prompts/pitch_prompt.txt` — ensures the backend can reproduce prompt behavior.
- A short example script (optional) called `examples/test_models.py` with a few test calls to each function (I can prepare this if you'd like).

---

## 9) Next steps I can take for you (pick any):
- Prepare an example `examples/test_models.py` script that runs the three smoke tests.
- Patch `models/slang_to_pitch.py` to remove the hard-coded API key and read from `GENAI_API_KEY`.
- Generate a small `.env.example` file (without real secrets) showing the keys to set.

Tell me which of the next steps you want me to do and I will create the files and tests for the backend person.

