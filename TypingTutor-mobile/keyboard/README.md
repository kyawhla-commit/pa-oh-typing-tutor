# Pa-O keyboard reference

- `text.txt`: the supplied XKB `basic` layout (47 keys, up to four levels).
- `Pasted image.png`: the supplied visual keyboard reference.
- `text1.txt`: a Linux/XKB installer script, kept as reference only. It is not
  run by the Android app or included in its production resources.

`PaohKeyboard.kt` implements the direct outputs from `text.txt`. The JVM tests
load that file and compare every supplied key/level with the Android mapping.
The phone keeps those physical-key associations on four large-key pages:
Keys (Q row), Marks (A row), More (Z row), and 123 (number row).

Pa-O and Pa-O + Shift use XKB levels 1–2. ABC and ABC + Shift expose levels 3–4.
The quote and slash keys only specify two levels; the phone deliberately keeps
those punctuation outputs available in ABC mode too. The optional `tilde_switch`
modifier is not enabled; the explicit ABC button switches layers on the phone.
Shift stays on until toggled or changed by a next-key hint. Turn Hints off to keep
manual page/language/Shift choices while practicing. Keypad taps scroll the
typing field into view without moving the keypad controls.

These files define key outputs, not contextual character-reordering rules.
The mobile keypad inserts exactly the selected output at the cursor; it does not
perform automatic syllable reordering. An installed language keyboard can still
be used through “Use phone keyboard”.
