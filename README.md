# CRAB SHACK 2

The sequel: not just a kitchen — a whole beachside town, on the same
snescat toy-PPU engine (character-map pixel art, the snescat 5x7 font,
256x240 canvas, scanlines) as CRAB SHACK.

Every crab is somebody now. They have names, a personality trait
(SPEEDY, LAZY, CHEERY, GRUMPY, TIDY, DREAMY — it changes how they move,
work, tip out, and what they say), an off-duty accessory, a house of
their own, a shift (8-14 or 14-20), and a commute: they walk, bike,
ride the SAND BUS between two stops, or drive their beach buggy down
the coast road. On shift they don the toque and run the CS1 kitchen
loop; at close they head home under the string lights and sleep.

- **Follow-cam**: click a crab in the world or its portrait in the CREW
  tab to follow it around town; a card shows its name, trait, commute,
  live status, and shift. Drag / arrow keys to free-roam, ESC to let go.
- **Day cycle**: 6 real minutes per day — dawn, service, dusk, stars,
  moon, CLOSED sign, shack string lights.
- **Stakes — everything settles nightly at 20:00**: ingredients cost
  money (fish $5, fruit $3 — every dish has a margin); you pay each crab
  an $18/day wage; each crab pays $8/day rent on their house from their
  own wallet (shown on the follow card); and the landlord collects a
  flat, honest $115/night for the shack — announced up front, first
  night free, never changes. Miss the shack rent and it's EVICTED —
  game over. Miss a crab's wages and they can't make their own rent:
  they lose the house and move into the town SHELTER (rent-free), keep
  working, and move back once they've saved the $25 deposit. You open
  with $140.
- **Idle economy**: same coins/tips as CS1; SHOP tab has HIRE CRAB (each
  hire is a new random personality who moves into the next house),
  SHOES, KNIFE, FLAME, EXPAND, ADS. Saves to localStorage with offline
  earnings.

**You lose by default, but just barely.** Tuned via the headless
simulator (`node tools/headless.mjs --days 30 --seeds 8 [--buy chef,ads,knife,flame]`),
which runs the real game code against stubbed browser APIs at ~1000x:
an untouched shack can't cover the lease and gets evicted around day
10-13; sharpening knives only delays it (median day 17); actually
growing — hiring crabs and running ads — survives indefinitely (7/8
seeds at 40 days). The rent never changes and the founding duo PINCHY &
CLAWDIA are always the same, so every loss is honest arithmetic, not a
moving goalpost; hires are the gacha.

Music by Matt Clanker, made with Suno — a rotating playlist: "Pixel
Wave Waltz", "Regalia of the Surf", "Regalia Waltz", "Butter Pow", and
"Carnival of the Glitch". `N` toggles music, `B` skips to the next track.
Static page, no build step — GitHub Pages from main/root. `?fresh` for a
throwaway session. M/N toggle sfx/music.
