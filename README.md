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

## Spend and balance per person

- **People** shows, for everyone, what you've spent on them so far and how many gifts that covers.
- On a person's page, **Gifts from them** is where you log what they gave you, with the date and roughly what it was worth. The page then shows three totals: what you've spent on them, what they've spent on you, and the **balance** (for example "S$10.00 behind" if they've spent S$10 more on you). The same balance shows on the People list, so you know who should get a bigger gift next time to break even.
- Gifts without a cost aren't counted, and the page says how many were left out. Gifts you received never count as gifts *for* that person, so they don't affect who's covered for an occasion, the reminder, or "last time".

## Planned: share with friends

Not built yet. The landing page (`/welcome`) and the home page both link to a preview with made-up data at http://localhost:3000/preview/sharing.

The idea: today you type in what friends gave you yourself. With sharing, a friend keeps their side of the record in their own app.

1. **Invite a friend** from their page. They get a link and sign up.
2. **They see what you gave them**, but only once each occasion has come (on or after the occasion date). A gift you've logged for Christmas 2026 stays hidden until 25 Dec 2026, so logging early never spoils a surprise.
3. **They log what they give you** in their own app, and it shows up on your side under "Gifts from them". You no longer type it in yourself.
4. **You both see the balance**: you spent S$10 on them, they spent S$15 on you, so you're S$5 behind.

What it needs that the app doesn't have yet: hosting (it runs on your PC only today), accounts and logins, invite links, and a way to link "Amy" on your list to Amy's account. The data won't need to change. Each gift a friend logs for you becomes a row in the same `received` table that you fill in by hand today, and the rule for what a friend can see is already written (`visibleToFriend` in `src/balance.js`).

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
