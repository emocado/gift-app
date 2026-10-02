# Gift App

One place to check who you gave what to, when you gave it, and roughly how much it cost, so you don't have to remember it before the next occasion.

## Success measure

- **Outcome:** before an occasion, I can say who I've already given to, what I gave, when, and roughly what it cost, using the app instead of my memory.
- **Baseline (fill in before using):** for Christmas 2025, I can recall this for ___ of ___ people.
- **Target:** for **Christmas 2026 (25 Dec 2026)**, every person on my list can be answered from the app.
- **Guardrail:** the time and money I spend on gifts must not go up.
- **Riskiest assumption:** that I'll log each gift as I buy it, with no one chasing me.
- **Pass mark:** I log every gift for Christmas 2026. At my next occasion, I answer "what did I give this person last time?" from the app.

## Run

Needs Node 24 or newer. It runs on your PC only, at http://localhost:3000.

```
npm install
copy .env.example .env      # then fill it in
npm start                   # open http://localhost:3000
npm test                    # tests for the core logic (free, no network)
```

The look follows the season: snow from 1 Dec to 6 Jan, blossom petals to April, light rain through August, then falling leaves. They settle into a small pile along the bottom of the window. To try another one, pick it from the season menu next to "Gift" at the top of any page. Your browser remembers the pick, and "Automatic" goes back to following the date. `SEASON=winter` (or `spring`, `summer`, `autumn`) in `.env` changes the automatic one. The animation is switched off if your system asks for reduced motion.

There's a landing page at http://localhost:3000/welcome. Its hero is a looping CSS animation: a present unwraps, past gifts rise out, one is typed in, and the countdown drops. It's CSS only, like the rest of the app, and has a pause button. With reduced motion it shows a still frame.

Amounts are in SGD. Data is stored in `data/gifts.db` (one SQLite file, not committed). Back it up by copying that file.

## Type-to-log (AI)

With `OPENCODE_API_KEY` set in `.env` (an [OpenCode Zen](https://opencode.ai/zen) key), the Add a gift page gets a box where you type one line, like `scarf for Amy, xmas, 25`. The model (`deepseek-v4.1-flash` by default) fills in the form and you check it before saving.

- Plain code, not the model, enforces three rules. A cost that isn't in what you typed is dropped. Names are matched to your list. Malformed dates are blanked.
- If the model is slow, fails or isn't set up, the normal form still works. Without the key, the box doesn't appear.
- To try another model on your OpenCode account, set `AI_MODEL` in `.env` (e.g. `qwen3.8-max`), then run the eval with `--model` set to it to compare.

## Evaluation: how well type-to-log reads your notes

`eval/cases.json` holds 42 typed notes with the answers they should produce (see `eval/CASES.md`). The grader (`eval/grade.mjs`) is plain code, with no AI judge. It scores:

- **All fields:** the headline. Every field is right.
- **No made-up $:** the guardrail, which must stay at 100%. No cost appears that the note never stated.
- Each field on its own: person, what, occasion, cost, date bought, occasion date.

```
npm run eval -- --approve-harness   # first run only, after you have reviewed the eval files
npm run eval                        # calls the model once per case; resumes if interrupted
```

Results go to `.claude/hillclimb/type-to-log/baseline/` (`results.jsonl`, plus `traces/` with the full request and response for each case). The runner refuses to run again if the prompt, grader, cases or runner change, until you approve them again with `--approve-harness`. That way a changed eval never runs without you noticing.

## Reminder email

```
npm run remind -- --dry-run   # print the email
npm run remind                # send it (needs the SMTP_* and REMIND_TO settings in .env)
```

It lists everyone still to buy for in the next `REMIND_DAYS` (default 30), with what they got last time. If nothing is open, no email is sent. The home page shows the same list, so a missed email never means a missed gift.

For Gmail, create an app password at https://myaccount.google.com/apppasswords and use it as `SMTP_PASS`.

**Send it every Sunday at 9am** (run once in PowerShell, from this folder). `-StartWhenAvailable` means a run missed while the PC was off happens the next time it's on:

```powershell
$dir = (Get-Location).Path
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d `"$dir`" && npm run remind >> data\remind.log 2>&1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 9am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName "Gift reminder" -Action $action -Trigger $trigger -Settings $settings
```

To remove it: `Unregister-ScheduledTask -TaskName "Gift reminder"`.
